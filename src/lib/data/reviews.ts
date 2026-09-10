"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import type { ActionResult, Track } from "@/lib/types";
import { FORM_DEFINITIONS, SCORE_MAX, SCORE_MIN } from "@/lib/forms/tracks";
import type { ApplicantSummary, Review, ReviewInput, ReviewRow } from "@/lib/data/types";
import { requireRole } from "@/lib/data/profiles";

const REVIEWER_SELECT = "*, reviewer:profiles!inner(id, full_name, email)";

type ReviewWithReviewer = ReviewRow & { reviewer: ApplicantSummary };

const idSchema = z.uuid();
const scoreSchema = z
  .number({ error: "Pick a score" })
  .int("Scores are whole numbers")
  .min(SCORE_MIN, `Scores run from ${SCORE_MIN} to ${SCORE_MAX}`)
  .max(SCORE_MAX, `Scores run from ${SCORE_MIN} to ${SCORE_MAX}`);

function reviewSchemaFor(track: Track) {
  const shape: Record<string, typeof scoreSchema> = {};
  for (const criterion of FORM_DEFINITIONS[track].rubric) {
    shape[criterion.key] = scoreSchema;
  }
  return z.object({
    scores: z.strictObject(shape, { error: "Score every criterion" }),
    overall: scoreSchema,
    notes: z.string().trim().max(4000, "Keep notes under 4000 characters").default(""),
  });
}

function parseScores(value: Json): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const scores: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) scores[key] = raw;
  }
  return scores;
}

function toReview(row: ReviewWithReviewer): Review {
  return { ...row, scores: parseScores(row.scores) };
}

export async function listReviews(applicationId: string): Promise<Review[]> {
  const parsedId = idSchema.safeParse(applicationId);
  if (!parsedId.success) return [];
  await requireRole("organizer");
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(REVIEWER_SELECT)
    .eq("application_id", parsedId.data)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toReview);
}

export async function getMyReview(applicationId: string): Promise<Review | null> {
  const parsedId = idSchema.safeParse(applicationId);
  if (!parsedId.success) return null;
  const organizer = await requireRole("organizer");
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(REVIEWER_SELECT)
    .eq("application_id", parsedId.data)
    .eq("reviewer_id", organizer.id)
    .maybeSingle();
  return data ? toReview(data) : null;
}

export async function upsertReview(applicationId: string, input: ReviewInput): Promise<ActionResult<Review>> {
  const parsedId = idSchema.safeParse(applicationId);
  if (!parsedId.success) return { ok: false, error: "Unknown application" };

  const organizer = await requireRole("organizer");
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("id, track, status")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!application) return { ok: false, error: "Unknown application" };
  if (application.status === "draft") return { ok: false, error: "Drafts cannot be reviewed yet" };

  const parsed = reviewSchemaFor(application.track).safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join(".");
      if (!key || fieldErrors[key]) continue;
      fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Check the scores and try again", fieldErrors };
  }

  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      {
        application_id: application.id,
        reviewer_id: organizer.id,
        scores: parsed.data.scores,
        overall: parsed.data.overall,
        notes: parsed.data.notes,
      },
      { onConflict: "application_id,reviewer_id" },
    )
    .select(REVIEWER_SELECT)
    .single();
  if (error || !data) return { ok: false, error: "Could not save your review. Try again." };

  revalidatePath("/org");
  revalidatePath("/org/applications");
  revalidatePath(`/org/applications/${application.id}`);
  return { ok: true, data: toReview(data) };
}
