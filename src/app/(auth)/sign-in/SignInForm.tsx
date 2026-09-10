"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type AuthFormState } from "../actions";

interface SignInFormProps {
  next?: string;
  demoPassword: string;
}

const DEMO_ACCOUNTS = [
  { label: "Applicant demo", email: "maya@demo.encore.dev" },
  { label: "Organizer demo", email: "organizer@demo.encore.dev" },
] as const;

export function SignInForm({ next, demoPassword }: SignInFormProps) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  const formRef = useRef<HTMLFormElement>(null);

  function fillDemo(email: string) {
    const form = formRef.current;
    if (!form) return;
    const emailInput = form.elements.namedItem("email");
    const passwordInput = form.elements.namedItem("password");
    if (!(emailInput instanceof HTMLInputElement) || !(passwordInput instanceof HTMLInputElement)) return;
    emailInput.value = email;
    passwordInput.value = demoPassword;
    form.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-lg font-medium text-fg">Sign in</h1>
        <p className="text-base text-muted">Pick up where you and your Roadie left off.</p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@berkeley.edu"
          defaultValue={state.values?.email}
          invalid={Boolean(state.fieldErrors?.email)}
          required
        />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(state.fieldErrors?.password)}
          required
        />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-2.5 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="md" loading={pending} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} className="text-fg hover:text-accent-hover">
          Create an account
        </Link>
      </p>

      {demoPassword && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-muted">Demo accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => fillDemo(account.email)}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
