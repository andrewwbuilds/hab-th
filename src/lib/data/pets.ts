"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyXp, derivePet, XP_EVENTS, type XpEventKey } from "@/lib/pet/engine";
import type { ActionResult, MusicProfile, PetSpec } from "@/lib/types";
import { musicProfileSchema, petFromRow, petToRow } from "@/lib/data/pet-row";
import { getCurrentUser, requireRole, requireUser } from "@/lib/data/profiles";

const nameSchema = z.string().trim().min(1, "Give your Roadie a name").max(40, "Keep the name under 40 characters");
const xpEventSchema = z.custom<XpEventKey>(
  (value) => typeof value === "string" && value in XP_EVENTS,
  "Unknown xp event",
);
const qualifierSchema = z.string().trim().min(1).max(80).optional();

function revalidateRoadie() {
  revalidatePath("/app", "layout");
}

export async function getMyPet(): Promise<PetSpec | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getPetForUser(user.id);
}

export async function getPetForUser(userId: string): Promise<PetSpec | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("pets").select("*").eq("user_id", userId).maybeSingle();
  return data ? petFromRow(data) : null;
}

export async function createPet(profile: MusicProfile, name: string): Promise<ActionResult<PetSpec>> {
  const parsed = musicProfileSchema.safeParse(profile);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your answers" };
  }
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) {
    return { ok: false, error: parsedName.error.issues[0]?.message ?? "Give your Roadie a name" };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("pets").select("*").eq("user_id", user.id).maybeSingle();

  const fresh = derivePet(parsed.data, parsedName.data);
  const spec: PetSpec = existing
    ? {
        ...fresh,
        xp: existing.xp,
        traits: { ...fresh.traits, xpEvents: petFromRow(existing).traits.xpEvents ?? [] },
      }
    : applyXp(fresh, "petCreated");

  const row = petToRow(spec);
  const { error } = existing
    ? await supabase.from("pets").update(row).eq("id", existing.id)
    : await supabase.from("pets").insert({ ...row, user_id: user.id });
  if (error) return { ok: false, error: "Could not save your Roadie. Try again." };

  revalidateRoadie();
  return { ok: true, data: spec };
}

export async function awardXp(eventKey: XpEventKey, qualifier?: string): Promise<ActionResult<PetSpec | null>> {
  const parsedEvent = xpEventSchema.safeParse(eventKey);
  const parsedQualifier = qualifierSchema.safeParse(qualifier);
  if (!parsedEvent.success || !parsedQualifier.success) {
    return { ok: false, error: "Unknown xp event" };
  }
  const user = await requireUser();
  const supabase = await createClient();
  const { data: row } = await supabase.from("pets").select("*").eq("user_id", user.id).maybeSingle();
  if (!row) return { ok: true, data: null };

  const current = petFromRow(row);
  const next = applyXp(current, parsedEvent.data, parsedQualifier.data);
  if (next.xp === current.xp) return { ok: true, data: current };

  const { error } = await supabase
    .from("pets")
    .update({ xp: next.xp, traits: petToRow(next).traits })
    .eq("id", row.id);
  if (error) return { ok: false, error: "Could not update your Roadie." };

  revalidateRoadie();
  return { ok: true, data: next };
}

/**
 * Organizer-side grant for events the applicant does not trigger themselves
 * (a decision landing). RLS only lets owners update pets, so this goes through
 * the admin client after an explicit organizer check.
 */
export async function awardXpToUser(
  userId: string,
  eventKey: XpEventKey,
  qualifier?: string,
): Promise<ActionResult<PetSpec | null>> {
  const parsedId = z.uuid().safeParse(userId);
  const parsedEvent = xpEventSchema.safeParse(eventKey);
  const parsedQualifier = qualifierSchema.safeParse(qualifier);
  if (!parsedId.success || !parsedEvent.success || !parsedQualifier.success) {
    return { ok: false, error: "Invalid xp grant" };
  }
  await requireRole("organizer");
  const admin = createAdminClient();
  const { data: row } = await admin.from("pets").select("*").eq("user_id", parsedId.data).maybeSingle();
  if (!row) return { ok: true, data: null };

  const current = petFromRow(row);
  const next = applyXp(current, parsedEvent.data, parsedQualifier.data);
  if (next.xp === current.xp) return { ok: true, data: current };

  const { error } = await admin
    .from("pets")
    .update({ xp: next.xp, traits: petToRow(next).traits })
    .eq("id", row.id);
  if (error) return { ok: false, error: "Could not update the applicant's Roadie." };
  return { ok: true, data: next };
}

export async function renamePet(name: string): Promise<ActionResult<PetSpec>> {
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) {
    return { ok: false, error: parsedName.error.issues[0]?.message ?? "Give your Roadie a name" };
  }
  const user = await requireUser();
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("pets")
    .update({ name: parsedName.data })
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not rename your Roadie." };
  if (!row) return { ok: false, error: "You do not have a Roadie yet." };

  revalidateRoadie();
  return { ok: true, data: petFromRow(row) };
}
