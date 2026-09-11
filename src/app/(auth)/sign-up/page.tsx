import type { Metadata } from "next";
import { trackFromParam } from "@/lib/navigation";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next, track } = await searchParams;
  return <SignUpForm next={typeof next === "string" ? next : undefined} initialTrack={trackFromParam(track)} />;
}
