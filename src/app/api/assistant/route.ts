import { NextResponse } from "next/server";
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, guideRequestSchema, truncate } from "@/lib/ai/guide";
import { allowRequest } from "@/lib/ai/limiter";
import { offlineGuide } from "@/lib/ai/offline";
import { askGuide } from "@/lib/ai/provider";
import { FORM_DEFINITIONS } from "@/lib/forms/tracks";
import { getPetForUser } from "@/lib/data/pets";
import { getCurrentUser } from "@/lib/data/profiles";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to ask your Roadie" }, { status: 401 });
  if (user.role !== "applicant") return NextResponse.json({ error: "Applicants only" }, { status: 403 });
  if (!allowRequest(user.id)) return NextResponse.json({ error: "Slow down" }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = guideRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { track, fieldKey, asking, asked, answers } = parsed.data;
  const definition = FORM_DEFINITIONS[track];
  const messages = parsed.data.messages
    .slice(-MAX_MESSAGES)
    .map((message) => ({ role: message.role, content: truncate(message.content, MAX_MESSAGE_CHARS) }));
  const last = messages.findLast((message) => message.role === "user");
  if (!last || last.content.trim() === "") {
    return NextResponse.json(offlineGuide({ definition, answers, fieldKey, asking, asked, message: "" }));
  }
  const pet = await getPetForUser(user.id);

  const response = await askGuide({ definition, answers, fieldKey, asking, asked, messages, pet });
  return NextResponse.json(response);
}
