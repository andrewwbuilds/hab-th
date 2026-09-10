"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useKeyboardShortcuts } from "@/components/shell/useKeyboardShortcuts";

export function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast({ title: "Draft saved" })}>Default toast</Button>
      <Button onClick={() => toast({ title: "Application submitted", description: "We will email you.", variant: "success" })}>
        Success toast
      </Button>
      <Button variant="danger" onClick={() => toast({ title: "Could not save", description: "Try again.", variant: "error" })}>
        Error toast
      </Button>
    </div>
  );
}

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Set decision"
        description="The applicant sees this immediately on their status page."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Set decision
            </Button>
          </>
        }
      >
        <p className="text-base text-muted">Pick accepted, waitlisted, or rejected in the real form.</p>
      </Dialog>
    </>
  );
}

export function TextareaDemo() {
  const [value, setValue] = useState("");
  return (
    <Textarea
      id="why"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Type a few lines to see it grow"
      minRows={2}
      maxRows={6}
    />
  );
}

export function ShortcutDemo() {
  const [last, setLast] = useState("none yet");
  useKeyboardShortcuts({
    j: () => setLast("j"),
    k: () => setLast("k"),
    "[": () => setLast("["),
    "]": () => setLast("]"),
    "mod+s": () => setLast("mod+s"),
  });
  return (
    <p className="text-base text-muted">
      Press j, k, [, ] or mod+s outside an input. Last: <span className="text-fg">{last}</span>
    </p>
  );
}
