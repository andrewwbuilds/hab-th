import type { Metadata } from "next";
import { Inbox, Plus } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { Wordmark } from "@/components/shell/Wordmark";
import type { NavItem } from "@/components/shell/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Kbd,
  Meter,
  ProgressBar,
  RadioGroup,
  Select,
  Spinner,
  StatusIcon,
  StatusPill,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Tooltip,
  TR,
} from "@/components/ui";
import { STATUSES, TRACKS, TRACK_LABEL } from "@/lib/types";
import { DialogDemo, ShortcutDemo, TextareaDemo, ToastDemo } from "./demos";

export const metadata: Metadata = { title: "UI kit" };

const nav: NavItem[] = [
  { href: "/dev/ui", label: "Kitchen sink", icon: "sparkles", exact: true },
  { href: "/dev/ui/applications", label: "Applications", icon: "inbox", badge: 128 },
  { href: "/dev/ui/reviews", label: "Reviews", icon: "checklist" },
  { href: "/dev/ui/roadie", label: "Roadie", icon: "disc" },
  { href: "/dev/ui/settings", label: "Settings", icon: "settings" },
];

const rows = [
  { name: "Ada Lovelace", email: "ada@berkeley.edu", track: "hacker", status: "under_review", score: 4 },
  { name: "Grace Hopper", email: "grace@berkeley.edu", track: "judge", status: "accepted", score: 5 },
  { name: "Linus Torvalds", email: "linus@berkeley.edu", track: "mentor", status: "submitted", score: 3 },
  { name: "Margaret Hamilton", email: "margaret@berkeley.edu", track: "volunteer", status: "draft", score: 0 },
  { name: "Ken Thompson", email: "ken@berkeley.edu", track: "hacker", status: "waitlisted", score: 2 },
  { name: "Barbara Liskov", email: "barbara@berkeley.edu", track: "hacker", status: "rejected", score: 1 },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function DevUiPage() {
  return (
    <AppShell
      workspace={{ name: "Hackathon at Berkeley", hint: "Spring 2026" }}
      nav={nav}
      user={{ name: "Andrew Wang", email: "andrew@berkeley.edu", role: "organizer" }}
      breadcrumbs={[{ label: "Dev", href: "/dev/ui" }, { label: "UI kit" }]}
      actions={
        <Button variant="primary" icon={<Plus />}>
          New application
        </Button>
      }
      commands={[
        { id: "new", label: "Create application", hint: "Pick a track", shortcut: "C", href: "/dev/ui" },
        { id: "help", label: "Keyboard shortcuts", shortcut: "?", href: "/dev/ui", group: "Help" },
      ]}
      sidebarFooter={
        <Card padding="sm" className="flex items-center gap-2.5">
          <span className="size-8 rounded-full bg-accent-soft" />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-medium">Nova</span>
            <span className="text-xs text-dim">Hatchling, 80 xp</span>
          </span>
        </Card>
      }
    >
      <div className="mx-auto flex max-w-[1040px] flex-col gap-8 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">UI kit</h1>
          <Wordmark size="md" />
        </div>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Submit application</Button>
            <Button>Save draft</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete draft</Button>
            <Button variant="primary" loading>
              Saving
            </Button>
            <Button disabled>Disabled</Button>
            <Button href="/dev/ui" icon={<Plus />}>
              Link button
            </Button>
            <Button size="md" variant="primary">
              Medium primary
            </Button>
            <Button size="md">Medium secondary</Button>
          </div>
        </Section>

        <Section title="Form controls">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" htmlFor="name" required hint="As it appears on your ID.">
              <Input id="name" placeholder="Ada Lovelace" />
            </Field>
            <Field label="Email" htmlFor="email" error="Enter a valid email address.">
              <Input id="email" type="email" defaultValue="ada@" invalid />
            </Field>
            <Field label="Track" htmlFor="track" optional>
              <Select
                id="track"
                placeholder="Pick a track"
                defaultValue=""
                options={TRACKS.map((track) => ({ value: track, label: TRACK_LABEL[track] }))}
              />
            </Field>
            <Field label="Medium input" htmlFor="md">
              <Input id="md" size="md" placeholder="32px control" />
            </Field>
            <Field label="Why do you want to hack?" htmlFor="why" hint="Two or three sentences is plenty." className="col-span-2">
              <TextareaDemo />
            </Field>
            <div className="col-span-2 flex flex-col gap-2">
              <Checkbox name="agree" label="I agree to the code of conduct" hint="Required to submit." defaultChecked />
              <Checkbox name="news" label="Email me about future events" />
              <Checkbox name="off" label="Disabled option" disabled />
            </div>
          </div>
        </Section>

        <Section title="Radio group: cards">
          <RadioGroup
            name="era"
            defaultValue="00s"
            options={[
              { value: "90s", label: "90s", hint: "Cassettes and CDs" },
              { value: "00s", label: "00s", hint: "iPod era" },
              { value: "10s", label: "10s", hint: "Streaming begins" },
              { value: "20s", label: "20s", hint: "Headphones everywhere" },
            ]}
            columns={4}
          />
        </Section>

        <Section title="Radio group: pills">
          <RadioGroup
            name="genre"
            variant="pills"
            defaultValue="indie"
            options={["electronic", "hiphop", "indie", "pop", "rock", "jazz"].map((genre) => ({
              value: genre,
              label: genre,
            }))}
          />
        </Section>

        <Section title="Status">
          <div className="flex flex-wrap items-center gap-4">
            {STATUSES.map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((status) => (
              <StatusPill key={status} status={status} bordered />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {STATUSES.map((status) => (
              <StatusIcon key={status} status={status} size={20} />
            ))}
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success" dot>
              Success
            </Badge>
            <Badge variant="warning" dot>
              Warning
            </Badge>
            <Badge variant="danger">Danger</Badge>
            {TRACKS.map((track) => (
              <Badge key={track} variant={track}>
                {TRACK_LABEL[track]}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Table">
          <Card padding="none" className="overflow-hidden">
            <Table maxHeight="200px">
              <THead>
                <TR>
                  <TH>Applicant</TH>
                  <TH>Track</TH>
                  <TH>Status</TH>
                  <TH>Score</TH>
                  <TH align="right">Updated</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row, index) => (
                  <TR key={row.email} selected={index === 1} interactive>
                    <TD>
                      <span className="flex items-center gap-2">
                        <Avatar name={row.name} size="sm" />
                        {row.name}
                        <span className="text-dim">{row.email}</span>
                      </span>
                    </TD>
                    <TD>
                      <Badge variant={row.track}>{TRACK_LABEL[row.track]}</Badge>
                    </TD>
                    <TD>
                      <StatusPill status={row.status} />
                    </TD>
                    <TD>
                      <Meter value={row.score} label={`Score ${row.score} of 5`} />
                    </TD>
                    <TD align="right" muted>
                      2h ago
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </Section>

        <Section title="Small pieces">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
            <Tooltip content="Moves to the next application">
              <Kbd>]</Kbd>
            </Tooltip>
            <Spinner />
            <Spinner size={20} className="text-accent" />
            <span className="flex items-center gap-2">
              <Avatar name="Ada Lovelace" size="sm" />
              <Avatar name="Grace Hopper" />
              <Avatar name="Linus" size="lg" />
            </span>
            <span className="flex items-center gap-3">
              <Meter value={1} />
              <Meter value={3} />
              <Meter value={5} />
              <Meter value={2} size="sm" />
            </span>
          </div>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <ProgressBar value={35} label="Application" showValue />
            <ProgressBar value={80} label="Roadie xp" />
          </div>
        </Section>

        <Section title="Overlays and feedback">
          <div className="flex flex-wrap items-center gap-2">
            <DialogDemo />
            <ToastDemo />
          </div>
          <ShortcutDemo />
        </Section>

        <Section title="Cards and empty state">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader
                title="Hacker application"
                description="Not started"
                actions={<Button variant="primary">Start</Button>}
              />
              <p className="mt-3 text-base text-muted">
                Build something over 36 hours with a team of up to four.
              </p>
            </Card>
            <Card padding="none">
              <EmptyState
                icon={<Inbox />}
                title="No applications yet"
                description="Applications show up here once someone submits one."
                action={<Button>Refresh</Button>}
              />
            </Card>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
