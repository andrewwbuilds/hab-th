"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signUp, type AuthFormState } from "../actions";

interface SignUpFormProps {
  next?: string;
}

export function SignUpForm({ next }: SignUpFormProps) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-lg font-medium text-fg">Create account</h1>
        <p className="text-base text-muted">One account covers every track you apply to.</p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Ada Lovelace"
          defaultValue={values.fullName}
          invalid={Boolean(errors.fullName)}
          required
        />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@berkeley.edu"
          defaultValue={values.email}
          invalid={Boolean(errors.email)}
          required
        />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          required
        />
      </Field>
      <Field
        label="Organizer invite code"
        htmlFor="inviteCode"
        optional
        hint="Leave blank to apply as a participant"
        error={errors.inviteCode}
      >
        <Input
          id="inviteCode"
          name="inviteCode"
          autoComplete="off"
          defaultValue={values.inviteCode}
          invalid={Boolean(errors.inviteCode)}
        />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-2.5 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="md" loading={pending} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"} className="text-fg hover:text-accent-hover">
          Sign in
        </Link>
      </p>
    </form>
  );
}
