"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDraft } from "@/lib/data/applications";
import { getProfile, HOME_BY_ROLE } from "@/lib/data/profiles";
import { applyPath, roadiePath, safeInternalPath } from "@/lib/navigation";
import { TRACKS, type Role } from "@/lib/types";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted non-secret values, echoed back so the form keeps them after a failed attempt. */
  values?: Record<string, string>;
}

const emailSchema = z.email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Use at least 8 characters");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(80, "Keep your name under 80 characters"),
  email: emailSchema,
  password: passwordSchema,
  inviteCode: z.string().trim().max(120).optional().default(""),
  track: z.enum(TRACKS, { error: "Choose what you are applying for" }),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function destinationFor(userId: string, fallbackRole: Role, next: string | null): Promise<string> {
  if (next) return next;
  const profile = await getProfile(userId);
  return HOME_BY_ROLE[profile?.role ?? fallbackRole];
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: text(formData, "email").trim().toLowerCase() };
  const parsed = signInSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: "That email and password do not match", values };
  }

  redirect(await destinationFor(data.user.id, "applicant", safeInternalPath(text(formData, "next"))));
}

function inviteCodeMatches(inviteCode: string, configuredCode: string | undefined): boolean {
  const a = Buffer.from(inviteCode);
  const b = Buffer.from(configuredCode ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = {
    fullName: text(formData, "fullName"),
    email: text(formData, "email").trim().toLowerCase(),
    inviteCode: text(formData, "inviteCode"),
    track: text(formData, "track"),
  };
  const parsed = signUpSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { fullName, email, password, inviteCode, track } = parsed.data;
  const wantsOrganizer = inviteCode.length > 0;
  if (wantsOrganizer && !inviteCodeMatches(inviteCode, process.env.ORGANIZER_INVITE_CODE)) {
    return { fieldErrors: { inviteCode: "That invite code is not valid" }, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    const taken = /already|exists/i.test(error.message);
    return taken
      ? { fieldErrors: { email: "An account with this email already exists" }, values }
      : { error: error.message, values };
  }
  if (!data.user || data.user.identities?.length === 0) {
    return { fieldErrors: { email: "An account with this email already exists" }, values };
  }
  if (!data.session) {
    return { error: "Account created, but sign-in is not available yet. Try signing in.", values };
  }

  const next = safeInternalPath(text(formData, "next"));
  if (wantsOrganizer) {
    const { error: grantError } = await createAdminClient()
      .from("profiles")
      .update({ role: "organizer" })
      .eq("id", data.user.id);
    if (grantError) {
      await supabase.auth.signOut();
      return { error: "Could not grant organizer access. Try again.", values };
    }
    redirect(next ?? HOME_BY_ROLE.organizer);
  }

  // The form autosaves a draft on first change, so a failure here only costs the head start.
  await createDraft(track);
  redirect(next ?? roadiePath(applyPath(track)));
}
