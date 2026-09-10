"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, HOME_BY_ROLE } from "@/lib/data/profiles";
import type { Role } from "@/lib/types";

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

function safeNextPath(raw: string): string | null {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
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

  redirect(await destinationFor(data.user.id, "applicant", safeNextPath(text(formData, "next"))));
}

async function grantOrganizer(userId: string, email: string, fullName: string): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (existing?.role === "organizer") return;
  // profiles_protect_role rejects role updates unless auth.uid() is an organizer, which the
  // service role is not, so the row is replaced instead of updated. Only inserts skip the trigger.
  await admin.from("profiles").delete().eq("id", userId);
  const { error } = await admin
    .from("profiles")
    .insert({ id: userId, email, full_name: fullName, role: "organizer" });
  if (error) throw new Error(`Could not grant organizer role: ${error.message}`);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = {
    fullName: text(formData, "fullName"),
    email: text(formData, "email").trim().toLowerCase(),
    inviteCode: text(formData, "inviteCode"),
  };
  const parsed = signUpSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { fullName, email, password, inviteCode } = parsed.data;
  const configuredCode = process.env.ORGANIZER_INVITE_CODE;
  const wantsOrganizer = inviteCode.length > 0;
  if (wantsOrganizer && (!configuredCode || inviteCode !== configuredCode)) {
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

  let role: Role = "applicant";
  if (wantsOrganizer) {
    await grantOrganizer(data.user.id, email, fullName);
    role = "organizer";
  }

  redirect(await destinationFor(data.user.id, role, safeNextPath(text(formData, "next"))));
}
