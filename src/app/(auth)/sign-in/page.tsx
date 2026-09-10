import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <SignInForm
      next={nextPath}
      // Seeded demo credentials, shipped to the client on purpose: this portal is a demo
      // and the seed accounts exist only so reviewers can try both roles in one click.
      demoPassword={process.env.SEED_PASSWORD ?? ""}
    />
  );
}
