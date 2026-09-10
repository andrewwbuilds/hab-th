import type { Chattiness, Era, PetMood, PetSpec, RoadieContext, Tone } from "@/lib/types";
import { hashString } from "@/lib/pet/names";

export const MAX_LINE_LENGTH = 140;

type Slot =
  | "homeEmpty"
  | "homeDrafts"
  | "homeWaiting"
  | "sectionStart"
  | "field"
  | "errors"
  | "m25"
  | "m50"
  | "m75"
  | "m100"
  | "submitted"
  | "underReview"
  | "accepted"
  | "waitlisted"
  | "rejected"
  | "roadie";

/**
 * Line grammar: text before "|" is the core, text after is an optional tail.
 * Terse pets drop the tail, talkative pets keep it and add a tag.
 * Placeholders: {artist} {era} {section} {error} {hint}.
 */
type Bank = Record<Slot, readonly string[]>;

/**
 * Everything the app knows about the screen, plus the Roadie profile page,
 * which has no application to talk about and talks about the pet instead.
 */
export type RoadieLineContext = Omit<RoadieContext, "screen"> & { screen: RoadieContext["screen"] | "roadie" };

const ERA_FLAVOR: Record<Era, string> = {
  "70s": "vinyl",
  "80s": "synth",
  "90s": "tape deck",
  "00s": "burned CD",
  "10s": "playlist",
  "20s": "algorithm",
};

const BANKS: Record<Tone, Bank> = {
  hype: {
    homeEmpty: [
      "No application yet. | Pick a track and let's go.",
      "Empty stage, full crowd. | Start an application and give them a show.",
      "{artist} did not get famous by waiting. | Pick a track.",
    ],
    homeDrafts: [
      "Draft's waiting. | Let's finish it before the {era} hits again.",
      "You started something. | Now land it.",
      "Drafts don't submit themselves. | Open one and push.",
    ],
    homeWaiting: [
      "It's in. | Now we wait, and waiting is easy when you already did the hard part.",
      "Submitted and loud. | Nothing to do but stretch.",
    ],
    sectionStart: [
      "New section: {section}. | Big energy, short answers.",
      "{section}. | Hit it like the first chorus.",
      "Let's rip through {section}. | You know this stuff.",
      "Fresh page. | Big energy, short answers.",
    ],
    field: [
      "{hint} | Say it loud.",
      "Here's the move: {hint}",
      "{hint} | Don't overthink it.",
    ],
    errors: [
      "Hold up. {error} | Fix that and keep the tempo.",
      "One snag. {error}",
      "Almost. {error} | Then we're back on beat.",
    ],
    m25: [
      "Quarter done. | The intro is the hard part.",
      "25 percent in. | Keep the drums going.",
    ],
    m50: [
      "Halfway. | This is the drop.",
      "Half done, half to go. | Same energy.",
    ],
    m75: [
      "Three quarters. | Final chorus, bring it home.",
      "75 percent. | You can hear the end from here.",
    ],
    m100: [
      "Everything's filled in. | Read it once and hit submit.",
      "Full set. | Submit application when you're ready.",
    ],
    submitted: [
      "Submitted. | That's a headline set right there.",
      "It's in! | {artist} would be proud.",
      "Sent. | Go blast something on the {era}.",
    ],
    underReview: [
      "They're reading it right now. | Stay loud.",
      "Under review. | Someone is nodding along, I can feel it.",
    ],
    accepted: [
      "Accepted! | Encore! Encore!",
      "You're in! | Cue the confetti and the {era}.",
    ],
    waitlisted: [
      "Waitlisted. | That's the queue outside a sold out show, and doors open late.",
      "Waitlist. | Not a no. Keep the phone loud.",
    ],
    rejected: [
      "Not this time. | Every great act got told no once.",
      "Rejected. | It stings. Next one is louder.",
    ],
    roadie: [
      "Yeah, that's me. | Rename me if you dare.",
      "Looking good, right? | Every section you finish makes me louder.",
      "Front row seat to your own Roadie. | Go fill something in and watch me grow.",
    ],
  },
  chill: {
    homeEmpty: [
      "No application yet. | Whenever you're ready, pick a track.",
      "Nothing started. | That's fine. Start small.",
      "Put on some {artist} and pick a track. | No rush.",
    ],
    homeDrafts: [
      "You've got a draft going. | Pick it up when it feels right.",
      "Draft's saved. | It'll be here.",
      "A little progress. | That's still progress.",
    ],
    homeWaiting: [
      "It's submitted. | Nothing to do now but breathe.",
      "Sent and saved. | Put the {era} on and relax.",
    ],
    sectionStart: [
      "Next up: {section}. | Take it slow.",
      "{section}. | Easy does it.",
      "Starting {section}. | One answer at a time.",
      "Fresh form. | One answer at a time.",
    ],
    field: [
      "{hint} | No rush.",
      "Easy one. {hint}",
      "{hint} | Whatever comes to mind first is usually right.",
    ],
    errors: [
      "Small thing. {error} | Easy fix.",
      "Hey, {error} | No stress.",
      "Just this. {error}",
    ],
    m25: [
      "A quarter done. | Nice and steady.",
      "25 percent. | See, not so bad.",
    ],
    m50: [
      "Halfway there. | Good place for a stretch.",
      "Half done. | Keep the same pace.",
    ],
    m75: [
      "Three quarters. | Almost coasting now.",
      "75 percent. | Nearly there.",
    ],
    m100: [
      "All filled in. | Read it once more, then submit whenever.",
      "That's everything. | Submit application when it feels done.",
    ],
    submitted: [
      "Submitted. | Nice work. Go do nothing for a while.",
      "It's in. | {artist} on, feet up.",
      "Sent. | That deserves a slow afternoon.",
    ],
    underReview: [
      "Under review. | Someone's reading it. Let them.",
      "They're looking. | Nothing for you to do here.",
    ],
    accepted: [
      "Accepted. | Told you it would work out.",
      "You're in. | Quiet little celebration time.",
    ],
    waitlisted: [
      "Waitlisted. | Still in the room. Still fine.",
      "Waitlist. | That's a maybe, and maybes turn.",
    ],
    rejected: [
      "Not this time. | It happens. You're still good.",
      "Rejected. | Take a walk, then think about the next one.",
    ],
    roadie: [
      "Hey, that's me. | Rename me if you want. I'm easy.",
      "Just hanging out here. | Finish a section sometime and I'll grow a bit.",
      "This is the whole me. | Not bad for a few questions.",
    ],
  },
  moody: {
    homeEmpty: [
      "No application. | The blank page stares back. Stare harder.",
      "Nothing started yet. | Pick a track before the {era} skips again.",
      "You have {artist} in your ears and nothing on the page. | Change one of those.",
    ],
    homeDrafts: [
      "A draft, half lit. | Finish it or it haunts you.",
      "Unfinished drafts are the worst kind of B-side. | Open one.",
      "It's still a draft. | Turn it into a song.",
    ],
    homeWaiting: [
      "It's submitted. | Now the long quiet part.",
      "Sent. | Waiting is its own kind of track.",
    ],
    sectionStart: [
      "{section}. | Say the true thing, not the polished thing.",
      "Now {section}. | Nobody reads this for the small talk.",
      "Starting {section}. | Keep it honest.",
      "Blank form. | Say the true thing, not the polished thing.",
    ],
    field: [
      "{hint} | Don't perform it.",
      "Plainly: {hint}",
      "{hint} | Say what's actually true.",
    ],
    errors: [
      "Something's off. {error}",
      "It won't go through. {error}",
      "There it is. {error} | Fix it and carry on.",
    ],
    m25: [
      "A quarter through. | The verse is written.",
      "25 percent. | Slow burn.",
    ],
    m50: [
      "Halfway. | The middle is where most people quit.",
      "Half done. | Keep the fade off.",
    ],
    m75: [
      "Three quarters. | The outro is in sight.",
      "75 percent. | Don't rush the ending.",
    ],
    m100: [
      "Everything's in. | Read it back once. Then submit.",
      "Complete. | Submit application before the doubt gets loud.",
    ],
    submitted: [
      "Submitted. | It's out of your hands, which is the scary part.",
      "Sent. | Put on some {artist} and let it sit.",
      "It's in. | The {era} keeps spinning either way.",
    ],
    underReview: [
      "Under review. | Someone's reading your words right now.",
      "They're reading. | Nothing to do but not refresh.",
    ],
    accepted: [
      "Accepted. | Turns out the honest version worked.",
      "You're in. | Let yourself feel it for once.",
    ],
    waitlisted: [
      "Waitlisted. | Not a no. Just a longer bridge.",
      "Waitlist. | Hold the note.",
    ],
    rejected: [
      "Rejected. | It's allowed to hurt. It's not allowed to be the end.",
      "Not this time. | Write it down and come back louder.",
    ],
    roadie: [
      "So this is what I look like. | Rename me if the name is wrong.",
      "You made me out of {artist} and a few clicks. | Not complaining.",
      "I grow when you write. | No pressure. Some pressure.",
    ],
  },
  warm: {
    homeEmpty: [
      "No application yet. | Pick a track and I'll walk you through it.",
      "Fresh start. | Choose a track whenever you like.",
      "Queue up some {artist} and pick a track. | I'm here for the whole thing.",
    ],
    homeDrafts: [
      "You have a draft saved. | Pick up where you left off.",
      "Good start on that draft. | A little more and it's done.",
      "Draft's safe with me. | Open it when you're ready.",
    ],
    homeWaiting: [
      "It's submitted. | You did the hard part.",
      "Sent and safe. | Go enjoy the {era} for a bit.",
    ],
    sectionStart: [
      "Next: {section}. | You've got this.",
      "Now {section}. | Short and honest works best.",
      "On to {section}. | I'll keep you company.",
      "Fresh form. | I'll keep you company the whole way.",
    ],
    field: [
      "{hint} | Take your time.",
      "Quick tip: {hint}",
      "{hint} | Your own words are the best ones.",
    ],
    errors: [
      "Almost there. {error}",
      "One thing to fix. {error}",
      "Small fix. {error} | Then we're good.",
    ],
    m25: [
      "A quarter done. | Nice, steady start.",
      "25 percent. | Good rhythm.",
    ],
    m50: [
      "Halfway there. | Proud of you already.",
      "Half done. | Keep going, it's flowing.",
    ],
    m75: [
      "Three quarters done. | The finish line is close.",
      "75 percent. | Almost home.",
    ],
    m100: [
      "Everything's filled in. | One last read, then submit.",
      "All done. | Submit application whenever you feel ready.",
    ],
    submitted: [
      "Submitted. | Really proud of you.",
      "It's in. | Put on {artist} and celebrate a little.",
      "Sent. | That took courage.",
    ],
    underReview: [
      "Under review. | Someone's reading it with care.",
      "They're reading it now. | Good things take a minute.",
    ],
    accepted: [
      "Accepted! | I knew it. Welcome in.",
      "You're in! | Go tell someone who'll cheer.",
    ],
    waitlisted: [
      "Waitlisted. | Still in the running, and I'm still here.",
      "Waitlist. | A maybe is not a no.",
    ],
    rejected: [
      "Not this time. | I'm sorry. It doesn't change what you made.",
      "Rejected. | That's hard. You're still good at this.",
    ],
    roadie: [
      "That's me. | Rename me if something else fits better.",
      "You built me out of your music. | I'll grow every time you finish a section.",
      "Nice to be looked at. | Ready when you are.",
    ],
  },
};

const TAGS: Record<Tone, readonly string[]> = {
  hype: ["Let's go.", "Volume up.", "No skips."],
  chill: ["Take your time.", "All good.", "No pressure."],
  moody: ["Anyway.", "Just saying.", "For what it's worth."],
  warm: ["I'm right here.", "You're doing great.", "One step at a time."],
};

const SLOT_BY_STATUS: Record<NonNullable<RoadieContext["status"]>, Slot> = {
  draft: "homeDrafts",
  submitted: "submitted",
  under_review: "underReview",
  accepted: "accepted",
  waitlisted: "waitlisted",
  rejected: "rejected",
};

function milestoneSlot(completion: number): Slot | null {
  if (completion >= 100) return "m100";
  if (completion >= 75) return "m75";
  if (completion >= 50) return "m50";
  if (completion >= 25) return "m25";
  return null;
}

function resolveSlot(ctx: RoadieLineContext): Slot {
  if (ctx.screen === "roadie") return "roadie";
  if (ctx.screen === "home") {
    if (!ctx.status) return "homeEmpty";
    if (ctx.status === "draft") return "homeDrafts";
    if (ctx.status === "submitted" || ctx.status === "under_review") return "homeWaiting";
    return SLOT_BY_STATUS[ctx.status];
  }
  if (ctx.screen === "status") {
    return ctx.status ? SLOT_BY_STATUS[ctx.status] : "homeWaiting";
  }
  if (ctx.errors && ctx.errors.length > 0) return "errors";
  if (ctx.fieldKey && ctx.fieldHint) return "field";
  if (ctx.completion !== undefined) {
    const milestone = milestoneSlot(ctx.completion);
    if (milestone) return milestone;
  }
  return "sectionStart";
}

function contextKey(ctx: RoadieLineContext): string {
  return [ctx.screen, ctx.track ?? "", ctx.section ?? "", ctx.fieldKey ?? "", ctx.status ?? ""].join("|");
}

function sentenceEnd(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function fill(template: string, spec: PetSpec, ctx: RoadieLineContext): string {
  const artist = spec.music.topArtist.trim() || "your top artist";
  const section = ctx.section ?? "this section";
  const error = ctx.errors?.[0] ? sentenceEnd(ctx.errors[0]) : "something needs a look.";
  const hint = ctx.fieldHint ? sentenceEnd(ctx.fieldHint) : "answer in your own words.";
  return template
    .replaceAll("{artist}", artist)
    .replaceAll("{era}", ERA_FLAVOR[spec.music.era])
    .replaceAll("{section}", section)
    .replaceAll("{error}", error)
    .replaceAll("{hint}", hint);
}

/** Lines that name the section are skipped until the form knows which section is open. */
function candidates(spec: PetSpec, ctx: RoadieLineContext): readonly string[] {
  const bank = BANKS[spec.traits.tone][resolveSlot(ctx)];
  if (ctx.section !== undefined) return bank;
  const withoutSection = bank.filter((template) => !template.includes("{section}"));
  return withoutSection.length > 0 ? withoutSection : bank;
}

function assemble(template: string, chattiness: Chattiness, tag: string): string {
  const [core, tail] = template.split("|").map((part) => part.trim());
  if (chattiness === "terse" || !tail) return core;
  const joined = `${core} ${tail}`;
  if (chattiness === "normal") return joined;
  const withTag = `${joined} ${tag}`;
  return withTag.length < MAX_LINE_LENGTH ? withTag : joined;
}

function clip(line: string): string {
  if (line.length < MAX_LINE_LENGTH) return line;
  const firstSentence = line.match(/^[^.!?]*[.!?]/)?.[0];
  if (firstSentence && firstSentence.length < MAX_LINE_LENGTH) return firstSentence;
  return `${line.slice(0, MAX_LINE_LENGTH - 4).trimEnd()}...`;
}

/**
 * Picks a line for the pet's tone and the current screen. Same spec and
 * context always give the same line; bump `variant` to cycle alternates.
 */
export function getRoadieLine(spec: PetSpec, ctx: RoadieLineContext, variant = 0): string {
  const tone = spec.traits.tone;
  const bank = candidates(spec, ctx);
  const seed = hashString(contextKey(ctx));
  const template = bank[(seed + variant) % bank.length];
  const tag = TAGS[tone][(seed >>> 4) % TAGS[tone].length];
  return clip(assemble(fill(template, spec, ctx), spec.traits.chattiness, tag));
}

/** Number of alternate lines available for a context, for cycling in the dock. */
export function lineVariantCount(spec: PetSpec, ctx: RoadieLineContext): number {
  return candidates(spec, ctx).length;
}

/** The mood a context implies, before any explicit override. */
export function moodForContext(ctx: RoadieLineContext): PetMood {
  if (ctx.screen === "roadie") return "happy";
  if (ctx.errors && ctx.errors.length > 0) return "worried";
  if (ctx.status === "accepted") return "celebrate";
  if (ctx.status === "rejected") return "worried";
  if (ctx.status === "submitted" && ctx.screen === "status") return "celebrate";
  if (ctx.status === "submitted" || ctx.status === "under_review" || ctx.status === "waitlisted") return "happy";
  if (ctx.screen === "form" && (ctx.completion ?? 0) >= 100) return "happy";
  return "idle";
}
