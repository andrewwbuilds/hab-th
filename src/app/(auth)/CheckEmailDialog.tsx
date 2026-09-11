"use client";

import { Button, Dialog } from "@/components/ui";

interface CheckEmailDialogProps {
  email: string | null;
  onClose: () => void;
  signInHref?: string;
}

export function CheckEmailDialog({ email, onClose, signInHref }: CheckEmailDialogProps) {
  return (
    <Dialog
      open={email !== null}
      onClose={onClose}
      size="sm"
      title="Check your email"
      description={
        <>
          Open the confirmation link we sent to <span className="text-fg">{email}</span>, then sign in.
        </>
      }
      footer={
        signInHref ? (
          <Button href={signInHref} variant="primary" size="md">
            Go to sign in
          </Button>
        ) : (
          <Button variant="primary" size="md" onClick={onClose}>
            Got it
          </Button>
        )
      }
    />
  );
}
