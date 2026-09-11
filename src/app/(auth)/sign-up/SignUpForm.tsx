"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Field, Input, RadioGroup, useToast, type RadioOption } from "@/components/ui";
import { FORM_DEFINITIONS } from "@/lib/forms/tracks";
import { trackFromParam } from "@/lib/navigation";
import { TRACKS, TRACK_LABEL, type Track } from "@/lib/types";
import { signUp, type AuthFormState } from "../actions";
import { CheckEmailDialog } from "../CheckEmailDialog";

interface SignUpFormProps {
  next?: string;
  initialTrack: Track;
}

const TRACK_OPTIONS: RadioOption[] = TRACKS.map((track) => ({
  value: track,
  label: TRACK_LABEL[track],
  hint: FORM_DEFINITIONS[track].blurb,
}));

export function SignUpForm({ next, initialTrack }: SignUpFormProps) {
  const { toast } = useToast();
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [state, action, pending] = useActionState<AuthFormState, FormData>(async (prev, formData) => {
    const result = await signUp(prev, formData);
    if (result.error) toast({ title: result.error, variant: "error", duration: 5000 });
    if (result.confirmEmail) setConfirmEmail(result.confirmEmail);
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const selectedTrack = trackFromParam(values.track, initialTrack);
  const signInHref = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";

  return (
    <>
      <form action={action} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-fg">Create account</h1>
          <p className="text-md text-muted">Pick the track you are applying for below.</p>
        </div>

        {next && <input type="hidden" name="next" value={next} />}

        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            size="md"
            className="h-9"
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
            size="md"
            className="h-9"
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
            size="md"
            className="h-9"
            invalid={Boolean(errors.password)}
            required
          />
        </Field>
        <Field label="What are you applying for?" error={errors.track}>
          <RadioGroup
            name="track"
            aria-label="What are you applying for?"
            options={TRACK_OPTIONS}
            defaultValue={selectedTrack}
            columns={2}
            required
          />
        </Field>
        <Field
          label="Organizer invite code"
          htmlFor="inviteCode"
          optional
          hint="Leave blank to apply. Organizers skip the track above."
          error={errors.inviteCode}
        >
          <Input
            id="inviteCode"
            name="inviteCode"
            autoComplete="off"
            size="md"
            className="h-9"
            defaultValue={values.inviteCode}
            invalid={Boolean(errors.inviteCode)}
          />
        </Field>

        <Button type="submit" variant="primary" size="md" loading={pending} className="mt-1 h-10 w-full text-md">
          Create account
        </Button>

        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href={signInHref} className="text-fg hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </form>

      <CheckEmailDialog email={confirmEmail} onClose={() => setConfirmEmail(null)} signInHref={signInHref} />
    </>
  );
}
