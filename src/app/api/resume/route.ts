import { NextResponse } from "next/server";
import { guideRequestSchema } from "@/lib/ai/guide";
import { allowRequest } from "@/lib/ai/limiter";
import { askResume } from "@/lib/ai/provider";
import { RESUME_MAX_BYTES } from "@/lib/ai/resume";
import { extractResumeText } from "@/lib/ai/resume-text";
import { FORM_DEFINITIONS } from "@/lib/forms/tracks";
import { getPetForUser } from "@/lib/data/pets";
import { getCurrentUser } from "@/lib/data/profiles";

/** PDF parsing plus a long model call can run past the default budget. */
export const maxDuration = 60;

/** A resume is a one-off; the ceiling only stops a loop. */
const RESUMES_PER_MINUTE = 6;

const fieldsSchema = guideRequestSchema.pick({ track: true, answers: true });

const READ_ERRORS = {
  unsupported: "Upload a PDF or a plain text file.",
  unreadable: "Could not open that file. Export it as a PDF and try again.",
  empty: "No text in that file. A scanned PDF needs a text layer; export it from the editor instead.",
} as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload a resume" }, { status: 401 });
  if (user.role !== "applicant") return NextResponse.json({ error: "Applicants only" }, { status: 403 });
  if (!allowRequest(`resume:${user.id}`, Date.now(), RESUMES_PER_MINUTE)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the resume as form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: READ_ERRORS.empty }, { status: 422 });
  if (file.size > RESUME_MAX_BYTES) return NextResponse.json({ error: "Keep the file under 5 MB" }, { status: 413 });

  let answers: unknown = {};
  try {
    answers = JSON.parse(String(form.get("answers") ?? "{}"));
  } catch {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }
  const parsed = fieldsSchema.safeParse({ track: form.get("track"), answers });
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const extracted = await extractResumeText(file);
  if (!extracted.ok) return NextResponse.json({ error: READ_ERRORS[extracted.reason] }, { status: 422 });

  const definition = FORM_DEFINITIONS[parsed.data.track];
  const pet = await getPetForUser(user.id);
  const response = await askResume({ definition, answers: parsed.data.answers, pet, resume: extracted.text });
  return NextResponse.json(response);
}

