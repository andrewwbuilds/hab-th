"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  DECISIONS,
  STATUSES,
  TRACKS,
  type ActionResult,
  type Decision,
  type Status,
  type Track,
} from "@/lib/types";
import { FORM_DEFINITIONS } from "@/lib/forms/tracks";
import { completion, parseAnswers, validateAnswers, type Answers } from "@/lib/forms/schema";
import type {
  AdjacentIds,
  Application,
  ApplicationDetail,
  ApplicationFilters,
  ApplicationListItem,
  ApplicationRow,
  MyApplication,
  OrganizerStats,
  Review,
  ReviewerStat,
} from "@/lib/data/types";
import { requireRole, requireUser } from "@/lib/data/profiles";
import { awardXp, awardXpToUser, getPetForUser } from "@/lib/data/pets";
import { listReviews } from "@/lib/data/reviews";

const trackSchema = z.enum(TRACKS);
const idSchema = z.uuid();
const answersSchema = z.record(
  z.string().min(1).max(64),
  z.union([z.string().max(5000), z.number(), z.boolean(), z.array(z.string().max(200)).max(50)]),
);
const organizerStatusSchema = z.enum(STATUSES.filter((status) => status !== "draft") as [Status, ...Status[]]);
const filtersSchema = z.object({
  track: trackSchema.optional(),
  status: z.enum(STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "oldest", "name", "score", "status"]).optional(),
});

const STATUS_ORDER: Record<Status, number> = {
  submitted: 0,
  under_review: 1,
  draft: 2,
  accepted: 3,
  waitlisted: 4,
  rejected: 5,
};

function isDecision(status: Status): status is Decision {
  return (DECISIONS as readonly string[]).includes(status);
}

function toApplication(row: ApplicationRow): Application {
  return { ...row, answers: parseAnswers(row.answers) };
}

function withCompletion(row: ApplicationRow): MyApplication {
  const application = toApplication(row);
  return { ...application, completion: completion(application.track, application.answers) };
}

function revalidateApplicant(track: Track) {
  revalidatePath("/app");
  revalidatePath(`/app/apply/${track}`);
  revalidatePath(`/app/status/${track}`);
}

function revalidateOrganizer(id?: string) {
  revalidatePath("/org");
  revalidatePath("/org/applications");
  if (id) revalidatePath(`/org/applications/${id}`);
}

export async function listMyApplications(): Promise<MyApplication[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  return (data ?? []).map(withCompletion);
}

export async function getMyApplication(track: Track): Promise<MyApplication | null> {
  const parsed = trackSchema.safeParse(track);
  if (!parsed.success) return null;
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .eq("track", parsed.data)
    .maybeSingle();
  return data ? withCompletion(data) : null;
}

export async function createDraft(track: Track): Promise<ActionResult<MyApplication>> {
  const parsed = trackSchema.safeParse(track);
  if (!parsed.success) return { ok: false, error: "Unknown track" };
  const user = await requireUser();
  const supabase = await createClient();

  const existing = await getMyApplication(parsed.data);
  if (existing) return { ok: true, data: existing };

  const { data, error } = await supabase
    .from("applications")
    .insert({ user_id: user.id, track: parsed.data })
    .select("*")
    .single();
  if (error || !data) {
    const raced = await getMyApplication(parsed.data);
    if (raced) return { ok: true, data: raced };
    return { ok: false, error: "Could not start the application. Try again." };
  }

  await awardXp("firstDraft");
  revalidateApplicant(parsed.data);
  revalidateOrganizer();
  return { ok: true, data: withCompletion(data) };
}

export async function saveDraft(track: Track, answers: Answers): Promise<ActionResult<MyApplication>> {
  const parsedTrack = trackSchema.safeParse(track);
  const parsedAnswers = answersSchema.safeParse(answers);
  if (!parsedTrack.success) return { ok: false, error: "Unknown track" };
  if (!parsedAnswers.success) return { ok: false, error: "Some answers could not be read" };

  const user = await requireUser();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .eq("track", parsedTrack.data)
    .maybeSingle();
  if (!current) return { ok: false, error: "Start the application before saving" };
  if (current.status !== "draft") return { ok: false, error: "This application is locked after submission" };

  const merged: Answers = { ...parseAnswers(current.answers), ...parsedAnswers.data };
  const { data, error } = await supabase
    .from("applications")
    .update({ answers: merged })
    .eq("id", current.id)
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "Could not save your draft. Try again." };

  const saved = withCompletion(data);
  for (const sectionKey of saved.completion.sectionsDone) {
    await awardXp("sectionComplete", `${parsedTrack.data}/${sectionKey}`);
  }
  revalidateApplicant(parsedTrack.data);
  return { ok: true, data: saved };
}

export async function submitApplication(track: Track): Promise<ActionResult<MyApplication>> {
  const parsedTrack = trackSchema.safeParse(track);
  if (!parsedTrack.success) return { ok: false, error: "Unknown track" };

  const user = await requireUser();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .eq("track", parsedTrack.data)
    .maybeSingle();
  if (!current) return { ok: false, error: "Start the application before submitting" };
  if (current.status !== "draft") return { ok: false, error: "This application was already submitted" };

  const validation = validateAnswers(parsedTrack.data, current.answers);
  if (!validation.ok) {
    return {
      ok: false,
      error: "Some required answers are missing or invalid",
      fieldErrors: validation.fieldErrors,
    };
  }

  const { data, error } = await supabase
    .from("applications")
    .update({
      answers: validation.answers,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "Could not submit. Try again." };

  await awardXp("submitted", parsedTrack.data);
  revalidateApplicant(parsedTrack.data);
  revalidateOrganizer(current.id);
  return { ok: true, data: withCompletion(data) };
}

function sanitizeQuery(q: string): string {
  return q.replace(/[,()%]/g, " ").trim();
}

function sortItems(items: ApplicationListItem[], sort: ApplicationFilters["sort"]): ApplicationListItem[] {
  const byNewest = (a: ApplicationListItem, b: ApplicationListItem) =>
    (b.submitted_at ?? b.created_at).localeCompare(a.submitted_at ?? a.created_at);
  switch (sort) {
    case "oldest":
      return items.sort((a, b) => byNewest(b, a));
    case "name":
      return items.sort((a, b) => a.applicant.full_name.localeCompare(b.applicant.full_name) || byNewest(a, b));
    case "score":
      return items.sort((a, b) => (b.avg_overall ?? -1) - (a.avg_overall ?? -1) || byNewest(a, b));
    case "status":
      return items.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byNewest(a, b));
    default:
      return items.sort(byNewest);
  }
}

export async function listApplications(filters: ApplicationFilters = {}): Promise<ApplicationListItem[]> {
  await requireRole("organizer");
  const parsed = filtersSchema.safeParse(filters);
  const { track, status, q, sort } = parsed.success ? parsed.data : {};
  const supabase = await createClient();

  let query = supabase.from("applications").select("*, applicant:profiles!inner(id, full_name, email)");
  if (track) query = query.eq("track", track);
  if (status) query = query.eq("status", status);
  const needle = q ? sanitizeQuery(q) : "";
  if (needle) {
    query = query.or(`full_name.ilike.%${needle}%,email.ilike.%${needle}%`, { referencedTable: "profiles" });
  }
  const { data } = await query;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: summaries } = await supabase
    .from("application_review_summary")
    .select("*")
    .in(
      "application_id",
      rows.map((row) => row.id),
    );
  const summaryById = new Map(
    (summaries ?? []).map((summary) => [
      summary.application_id,
      { review_count: summary.review_count ?? 0, avg_overall: summary.avg_overall },
    ]),
  );

  const items = rows.map(({ applicant, ...row }): ApplicationListItem => {
    const summary = summaryById.get(row.id) ?? { review_count: 0, avg_overall: null };
    return { ...toApplication(row), applicant, ...summary };
  });
  return sortItems(items, sort);
}

export async function getApplication(id: string): Promise<ApplicationDetail | null> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return null;
  const organizer = await requireRole("organizer");
  const supabase = await createClient();

  const { data } = await supabase
    .from("applications")
    .select("*, applicant:profiles!inner(*)")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!data) return null;
  const { applicant, ...row } = data;

  const [pet, reviews, summaryResult] = await Promise.all([
    getPetForUser(row.user_id),
    listReviews(row.id),
    supabase.from("application_review_summary").select("*").eq("application_id", row.id).maybeSingle(),
  ]);
  const summary = {
    review_count: summaryResult.data?.review_count ?? 0,
    avg_overall: summaryResult.data?.avg_overall ?? null,
  };
  const myReview: Review | null = reviews.find((review) => review.reviewer_id === organizer.id) ?? null;

  return { ...toApplication(row), applicant, pet, reviews, summary, myReview };
}

export async function setStatus(id: string, status: Status): Promise<ActionResult<Application>> {
  const parsedId = idSchema.safeParse(id);
  const parsedStatus = organizerStatusSchema.safeParse(status);
  if (!parsedId.success) return { ok: false, error: "Unknown application" };
  if (!parsedStatus.success) return { ok: false, error: "Applications cannot be moved back to draft" };

  await requireRole("organizer");
  const supabase = await createClient();
  const decided = isDecision(parsedStatus.data);
  const { data, error } = await supabase
    .from("applications")
    .update({ status: parsedStatus.data, decided_at: decided ? new Date().toISOString() : null })
    .eq("id", parsedId.data)
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "Could not update the status. Try again." };

  if (decided) {
    await awardXpToUser(data.user_id, "decision", data.track);
  }
  revalidateOrganizer(data.id);
  revalidateApplicant(data.track);
  return { ok: true, data: toApplication(data) };
}

export async function getAdjacentIds(id: string, filters: ApplicationFilters = {}): Promise<AdjacentIds> {
  const items = await listApplications(filters);
  const index = items.findIndex((item) => item.id === id);
  return {
    prevId: index > 0 ? items[index - 1].id : null,
    nextId: index >= 0 && index < items.length - 1 ? items[index + 1].id : null,
    index,
    total: items.length,
  };
}

function emptyStatusCounts(): Record<Status, number> {
  return { draft: 0, submitted: 0, under_review: 0, accepted: 0, waitlisted: 0, rejected: 0 };
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function getOrganizerStats(): Promise<OrganizerStats> {
  await requireRole("organizer");
  const supabase = await createClient();

  const [applicationsResult, reviewsResult] = await Promise.all([
    supabase.from("applications").select("track, status, submitted_at"),
    supabase.from("reviews").select("overall, reviewer_id, reviewer:profiles!inner(full_name, email)"),
  ]);
  const applications = applicationsResult.data ?? [];
  const reviews = reviewsResult.data ?? [];

  const byTrack = Object.fromEntries(TRACKS.map((track) => [track, emptyStatusCounts()])) as Record<
    Track,
    Record<Status, number>
  >;
  const byStatus = emptyStatusCounts();
  for (const application of applications) {
    byTrack[application.track][application.status] += 1;
    byStatus[application.status] += 1;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const submissionsPerDay = Array.from({ length: 14 }, (_, offset) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (13 - offset));
    return { date: dayKey(day.toISOString()), count: 0 };
  });
  const dayIndex = new Map(submissionsPerDay.map((entry, index) => [entry.date, index]));
  for (const application of applications) {
    if (!application.submitted_at) continue;
    const index = dayIndex.get(dayKey(application.submitted_at));
    if (index !== undefined) submissionsPerDay[index].count += 1;
  }

  const reviewerTotals = new Map<string, ReviewerStat & { sum: number }>();
  let overallSum = 0;
  for (const review of reviews) {
    overallSum += review.overall;
    const entry = reviewerTotals.get(review.reviewer_id) ?? {
      reviewerId: review.reviewer_id,
      name: review.reviewer.full_name || review.reviewer.email,
      count: 0,
      avgOverall: null,
      sum: 0,
    };
    entry.count += 1;
    entry.sum += review.overall;
    reviewerTotals.set(review.reviewer_id, entry);
  }
  const reviewsPerReviewer: ReviewerStat[] = [...reviewerTotals.values()]
    .map(({ sum, ...entry }) => ({ ...entry, avgOverall: Math.round((sum / entry.count) * 100) / 100 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    total: applications.length,
    byTrack,
    byStatus,
    avgOverall: reviews.length ? Math.round((overallSum / reviews.length) * 100) / 100 : null,
    reviewCount: reviews.length,
    submissionsPerDay,
    reviewsPerReviewer,
  };
}

export async function getFormForTrack(track: Track) {
  return FORM_DEFINITIONS[track];
}
