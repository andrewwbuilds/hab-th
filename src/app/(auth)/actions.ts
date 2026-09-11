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
  /** Set when Supabase wants this address confirmed before the user can sign in. */
  confirmEmail?: string;
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
  if (error?.code === "email_not_confirmed") return { confirmEmail: values.email, values };
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

const isTaken = (message: string) => /already|exists/i.test(message);

/**
 * With the service-role key, the user is created pre-confirmed and signed in, so sign-up works even when the
 * project has "Confirm email" on. Without it, fall back to a plain sign-up, which only returns a session when
 * confirmations are off.
 */
async function createAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string,
  fullName: string,
): Promise<{ userId: string } | { taken: true } | { confirm: true } | { error: string }> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await createAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      return error?.code === "email_exists" || isTaken(error?.message ?? "")
        ? { taken: true }
        : { error: error?.message ?? "Could not create your account. Try again." };
    }
    const signedIn = await supabase.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.user) {
      return { error: "Account created, but we could not sign you in. Try signing in." };
    }
    return { userId: signedIn.data.user.id };
  }

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return isTaken(error.message) ? { taken: true } : { error: error.message };
  if (!data.user || data.user.identities?.length === 0) return { taken: true };
  if (!data.session) return { confirm: true };
  return { userId: data.user.id };
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
  if (wantsOrganizer && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Organizer sign-up is not configured on this server.", values };
  }

  const supabase = await createClient();
  const account = await createAccount(supabase, email, password, fullName);
  if ("taken" in account) {
    return { fieldErrors: { email: "An account with this email already exists" }, values };
  }
  if ("confirm" in account) return { confirmEmail: email, values };
  if ("error" in account) return { error: account.error, values };

  const next = safeInternalPath(text(formData, "next"));
  if (wantsOrganizer) {
    const { error: grantError } = await createAdminClient()
      .from("profiles")
      .update({ role: "organizer" })
      .eq("id", account.userId);
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
