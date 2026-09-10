import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <SignInForm
      next={nextPath}
      demoPassword={process.env.DEMO_LOGIN === "1" ? (process.env.SEED_PASSWORD ?? "") : ""}
    />
  );
}
