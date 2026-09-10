import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import type { Profile } from "@/lib/data/types";

export const HOME_BY_ROLE: Record<Role, string> = {
  applicant: "/app",
  organizer: "/org",
};

export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
  const metaName = user.user_metadata?.full_name;
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: typeof metaName === "string" ? metaName : "",
    role: "applicant",
    created_at: user.created_at,
  };
});

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireRole(role: Role): Promise<Profile> {
  const user = await requireUser();
  if (user.role !== role) redirect(HOME_BY_ROLE[user.role]);
  return user;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
