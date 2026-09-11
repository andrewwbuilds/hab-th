import { NextResponse } from "next/server";
import { z } from "zod";
import { allowRequest } from "@/lib/ai/limiter";
import { stylizePortrait } from "@/lib/ai/portrait-provider";
import { getCurrentUser } from "@/lib/data/profiles";

/** Image generation runs well past the default function budget. */
export const maxDuration = 60;

/** Each portrait costs a few cents, so the ceiling is far below the assistant's. */
const PORTRAITS_PER_MINUTE = 6;

/** The picker sends a 512px square PNG; anything larger than ~1 MB of base64 is not one of ours. */
const bodySchema = z.object({
  image: z.string().max(1_500_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Send a PNG data URL"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to draw your portrait" }, { status: 401 });
  if (user.role !== "applicant") return NextResponse.json({ error: "Applicants only" }, { status: 403 });
  if (!allowRequest(`portrait:${user.id}`, Date.now(), PORTRAITS_PER_MINUTE)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await stylizePortrait(parsed.data.image, user.id);
  if (result.ok) return NextResponse.json({ image: result.image });
  if (result.reason === "offline") {
    return NextResponse.json({ error: "Portraits are off on this server", offline: true }, { status: 503 });
  }
  return NextResponse.json({ error: "Could not draw your portrait. Try again." }, { status: 502 });
}
