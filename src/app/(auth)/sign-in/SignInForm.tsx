"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type AuthFormState } from "../actions";

interface SignInFormProps {
  next?: string;
  demoPassword: string;
}

const DEMO_ACCOUNTS = [
  { label: "Applicant demo", hint: "See the application as Maya", email: "maya@demo.encore.dev" },
  { label: "Organizer demo", hint: "Review and grade applications", email: "organizer@demo.encore.dev" },
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
    <form ref={formRef} action={action} className="flex flex-col gap-[clamp(0.75rem,2.5dvh,1.25rem)]" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-medium text-fg">Sign in</h1>
        <p className="text-md text-muted">Pick up where you and your Roadie left off.</p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@berkeley.edu"
          size="md"
          className="h-9"
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
          size="md"
          className="h-9"
          invalid={Boolean(state.fieldErrors?.password)}
          required
        />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-2.5 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="md" loading={pending} className="mt-1 h-10 w-full text-md">
        Sign in
      </Button>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} className="text-fg hover:text-accent-hover">
          Create an account
        </Link>
      </p>

      {demoPassword && (
        <div className="flex flex-col gap-[clamp(0.5rem,1.5dvh,0.75rem)] border-t border-border pt-[clamp(0.75rem,2.5dvh,1.25rem)]">
          <p className="text-sm text-muted">Or try a demo account</p>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={pending}
                onClick={() => fillDemo(account.email)}
                className="flex h-[clamp(2.5rem,6dvh,3rem)] w-full items-center justify-between gap-3 rounded-control border border-border-strong bg-panel px-3.5 text-left transition-colors duration-120 ease-out-quick hover:border-[#35363b] hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-medium text-fg">{account.label}</span>
                  <span className="truncate text-sm text-muted">{account.hint}</span>
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-dim" />
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
