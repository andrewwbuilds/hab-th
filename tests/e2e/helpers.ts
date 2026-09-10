import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";
import { loadLocalEnv } from "./env";

loadLocalEnv();

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}; copy .env.example to .env.local`);
  return value;
}

export const PASSWORD = "encore-e2e-password";
export const ORGANIZER_EMAIL = "organizer@demo.encore.dev";
export const ORGANIZER_PASSWORD = env("SEED_PASSWORD");

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.encore.dev`;
}

export function admin() {
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createApplicant(fullName: string): Promise<{ id: string; email: string }> {
  const email = uniqueEmail("applicant");
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`Could not create applicant: ${error?.message}`);
  return { id: data.user.id, email };
}

export const HACKER_ANSWERS = {
  school: "UC Berkeley",
  graduation_year: 2027,
  shirt_size: "m",
  experience_level: "intermediate",
  skills: ["frontend", "backend"],
  proud_project: "A CLI that syncs my class schedule to a calendar. Parsing the registrar was the hard part.",
  build_idea: "A tool that turns lecture recordings into flashcards for students who learn by review.",
  team_status: "solo",
  why_encore: "I want to ship something end to end with a team I have never met.",
};

export async function createSubmittedHackerApplication(userId: string): Promise<string> {
  const { data, error } = await admin()
    .from("applications")
    .insert({
      user_id: userId,
      track: "hacker",
      status: "submitted",
      answers: HACKER_ANSWERS,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not create application: ${error?.message}`);
  return data.id;
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
}
