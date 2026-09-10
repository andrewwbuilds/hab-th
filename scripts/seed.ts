import { createClient, type User } from "@supabase/supabase-js";
import type { Database, Json } from "../src/lib/database.types";
import type { Decision, MusicProfile, PetSpec, Status, Track } from "../src/lib/types";
import { applyXp, derivePet } from "../src/lib/pet/engine";
import { FORM_DEFINITIONS } from "../src/lib/forms/tracks";
import { completion, validateAnswers, type Answers } from "../src/lib/forms/schema";

const DEMO_DOMAIN = "@demo.encore.dev";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const PASSWORD = env("SEED_PASSWORD");

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Tables = Database["public"]["Tables"];
type ApplicationInsert = Tables["applications"]["Insert"];
type ReviewInsert = Tables["reviews"]["Insert"];
type PetInsert = Tables["pets"]["Insert"];

interface OrganizerSeed {
  email: string;
  fullName: string;
}

interface ReviewSeed {
  reviewer: "ari" | "sam";
  scores: Record<string, number>;
  overall: number;
  notes: string;
  daysAgo: number;
}

interface ApplicationSeed {
  track: Track;
  status: Status;
  answers: Answers;
  createdDaysAgo: number;
  submittedDaysAgo?: number;
  decidedDaysAgo?: number;
  reviews?: ReviewSeed[];
}

interface ApplicantSeed {
  email: string;
  fullName: string;
  petName: string;
  music: MusicProfile;
  applications: ApplicationSeed[];
}

const ORGANIZERS: Record<"ari" | "sam", OrganizerSeed> = {
  ari: { email: `organizer${DEMO_DOMAIN}`, fullName: "Ari Organizer" },
  sam: { email: `reviewer${DEMO_DOMAIN}`, fullName: "Sam Reviewer" },
};

const about = (overrides: Answers): Answers => ({
  school: "UC Berkeley",
  graduation_year: 2027,
  shirt_size: "m",
  ...overrides,
});

const APPLICANTS: ApplicantSeed[] = [
  {
    email: `maya${DEMO_DOMAIN}`,
    fullName: "Maya Chen",
    petName: "Pixlux",
    music: {
      genres: ["electronic", "pop", "indie"],
      energy: 4,
      mood: 4,
      era: "20s",
      hoursPerDay: "3to6",
      discovery: "playlists",
      topArtist: "Fred again..",
      anthem: "Delilah (pull me out of this)",
    },
    applications: [
      {
        track: "hacker",
        status: "submitted",
        createdDaysAgo: 6,
        submittedDaysAgo: 3,
        answers: about({
          school: "UC Berkeley",
          graduation_year: 2027,
          pronouns: "she/her",
          github: "https://github.com/mayachen",
          portfolio: "https://maya.dev",
          shirt_size: "s",
          experience_level: "intermediate",
          first_hackathon: false,
          skills: ["frontend", "backend", "design"],
          proud_project:
            "I built a CLI that syncs my class schedule from CalCentral into Google Calendar. The registrar page is a wall of nested tables, so most of the work was writing a resilient scraper and handling the week where lecture rooms changed mid-semester. If I did it again I would cache the parsed schedule and diff it instead of rewriting every event.",
          build_idea:
            "A tool that turns lecture recordings into spaced-repetition flashcards, for students who learn by review but never have time to make cards.",
          team_status: "partial",
          why_encore:
            "I want to ship something end to end in a weekend with people who are better than me at backend. Last time I mostly did CSS and I want to own a whole feature this time.",
        }),
      },
      {
        track: "volunteer",
        status: "draft",
        createdDaysAgo: 1,
        answers: about({ pronouns: "she/her", shirt_size: "s" }),
      },
    ],
  },
  {
    email: `diego${DEMO_DOMAIN}`,
    fullName: "Diego Alvarez",
    petName: "Rumbo",
    music: {
      genres: ["latin", "hiphop"],
      energy: 5,
      mood: 5,
      era: "10s",
      hoursPerDay: "over6",
      discovery: "friends",
      topArtist: "Bad Bunny",
      anthem: "Tití me preguntó",
    },
    applications: [
      {
        track: "hacker",
        status: "under_review",
        createdDaysAgo: 10,
        submittedDaysAgo: 8,
        answers: about({
          school: "San Jose State University",
          graduation_year: 2026,
          pronouns: "he/him",
          github: "https://github.com/dalvarez",
          linkedin: "https://linkedin.com/in/diego-alvarez-sjsu",
          shirt_size: "l",
          experience_level: "advanced",
          first_hackathon: false,
          skills: ["backend", "devops", "data"],
          proud_project:
            "For a database class I built a tiny write-ahead log and B-tree in Go. Crash recovery was the hard part; I wrote a fuzzer that killed the process mid-write and replayed the log, and it found four bugs in the first hour. Today I would use a page cache instead of reading the file on every lookup.",
          build_idea:
            "A tool for restaurant workers that turns a photo of a handwritten shift schedule into calendar invites and shift-swap requests. My mom runs a taqueria and does this on paper every week.",
          team_status: "solo",
          why_encore:
            "I have done two hackathons with the same friends and want to be forced onto a new team. I also want to demo something that a real person uses on Monday.",
        }),
        reviews: [
          {
            reviewer: "ari",
            scores: { technical_depth: 5, motivation: 4, collaboration: 4 },
            overall: 4,
            notes:
              "The WAL project is real depth, and the fuzzer detail tells me he actually finished it. Idea is grounded in a real user. Solo and open to a team.",
            daysAgo: 5,
          },
        ],
      },
    ],
  },
  {
    email: `priya${DEMO_DOMAIN}`,
    fullName: "Priya Raman",
    petName: "Quillon",
    music: {
      genres: ["classical", "jazz"],
      energy: 2,
      mood: 3,
      era: "70s",
      hoursPerDay: "1to3",
      discovery: "albums",
      topArtist: "Hilary Hahn",
      anthem: "Bach Chaconne in D minor",
    },
    applications: [
      {
        track: "judge",
        status: "submitted",
        createdDaysAgo: 5,
        submittedDaysAgo: 2,
        answers: about({
          school: "Stripe",
          graduation_year: 2016,
          pronouns: "she/her",
          linkedin: "https://linkedin.com/in/priyaraman",
          shirt_size: "m",
          company: "Stripe",
          role: "Staff engineer, payments infrastructure",
          expertise: ["systems", "security", "web"],
          judging_experience:
            "I judged the final round at Cal Hacks 10 and sit on our internal design review board, which sees about thirty proposals a quarter. I score against the rubric first and only then read my notes, because the polished demo is usually not the strongest build.",
          availability: ["sun_judging", "sat_afternoon"],
          conflicts:
            "My cousin is a sophomore at Berkeley and may apply as a hacker. I do not know anyone else planning to attend. No financial interests in any student projects.",
        }),
      },
      {
        track: "mentor",
        status: "submitted",
        createdDaysAgo: 5,
        submittedDaysAgo: 2,
        answers: about({
          school: "Stripe",
          graduation_year: 2016,
          pronouns: "she/her",
          linkedin: "https://linkedin.com/in/priyaraman",
          shirt_size: "m",
          expertise: ["systems", "security", "web"],
          mentoring_style: "whiteboard",
          past_mentoring:
            "I mentor two engineers on my team and spent a summer as a tutor for a coding bootcamp. My habit is to draw the data flow on a whiteboard with the team, then leave the marker with them.",
          availability: ["sat_afternoon", "sat_night"],
          first_hackathon_advice:
            "Pick the boring database. You do not have time to learn a new one and debug it at 3am.",
        }),
      },
    ],
  },
  {
    email: `jonah${DEMO_DOMAIN}`,
    fullName: "Jonah Whitfield",
    petName: "Fenwick",
    music: {
      genres: ["indie", "rock"],
      energy: 3,
      mood: 3,
      era: "00s",
      hoursPerDay: "3to6",
      discovery: "live",
      topArtist: "The National",
      anthem: "Bloodbuzz Ohio",
    },
    applications: [
      {
        track: "mentor",
        status: "accepted",
        createdDaysAgo: 13,
        submittedDaysAgo: 12,
        decidedDaysAgo: 4,
        answers: about({
          school: "Anthropic",
          graduation_year: 2019,
          pronouns: "he/him",
          github: "https://github.com/jwhitfield",
          shirt_size: "l",
          expertise: ["web", "ml", "data"],
          mentoring_style: "socratic",
          past_mentoring:
            "I ran the help desk at TreeHacks last year and TA'd CS 61B for two semesters. The pattern I see most is a team stuck on an environment problem for two hours because nobody wants to admit it. I try to get them to say the problem out loud, which usually solves it.",
          availability: ["fri_evening", "sat_night", "sun_morning"],
          first_hackathon_advice:
            "Cut the scope in half on Friday night, then cut it again Saturday morning. The teams that demo well are the ones that had a working ugly version by Saturday lunch and spent the rest of the time making it real.",
        }),
        reviews: [
          {
            reviewer: "ari",
            scores: { expertise: 5, communication: 5, availability: 5 },
            overall: 5,
            notes: "Saturday night coverage plus TA experience. Easy yes.",
            daysAgo: 9,
          },
          {
            reviewer: "sam",
            scores: { expertise: 4, communication: 5, availability: 5 },
            overall: 5,
            notes: "The advice paragraph is going in the welcome packet. Strong on ML and web, which is where most tickets come from.",
            daysAgo: 7,
          },
        ],
      },
    ],
  },
  {
    email: `amara${DEMO_DOMAIN}`,
    fullName: "Amara Okafor",
    petName: "Velvetine",
    music: {
      genres: ["rnb", "jazz", "hiphop"],
      energy: 3,
      mood: 4,
      era: "90s",
      hoursPerDay: "1to3",
      discovery: "albums",
      topArtist: "SZA",
      anthem: "Good Days",
    },
    applications: [
      {
        track: "hacker",
        status: "waitlisted",
        createdDaysAgo: 12,
        submittedDaysAgo: 11,
        decidedDaysAgo: 3,
        answers: about({
          school: "Howard University",
          graduation_year: 2028,
          pronouns: "she/her",
          github: "https://github.com/amaraokafor",
          shirt_size: "m",
          experience_level: "beginner",
          first_hackathon: true,
          skills: ["design", "pm"],
          proud_project:
            "I redesigned the signup flow for my dorm's laundry booking app as a class project in Figma, then convinced a friend to help me ship it in React. Fitting it into the existing code was harder than the design. I would learn the codebase first next time.",
          build_idea:
            "A campus lost-and-found board that matches item photos against reports, because our current system is a Google Form nobody reads.",
          team_status: "solo",
          why_encore: "I want to leave with a team I can keep building with and a demo I am not embarrassed by.",
        }),
        reviews: [
          {
            reviewer: "ari",
            scores: { technical_depth: 2, motivation: 4, collaboration: 5 },
            overall: 3,
            notes: "First hackathon, strong design instincts, light on code. Good beginner-track fit if we have room.",
            daysAgo: 8,
          },
          {
            reviewer: "sam",
            scores: { technical_depth: 2, motivation: 4, collaboration: 4 },
            overall: 3,
            notes: "Honest about experience level. Waitlist and revisit after the first acceptance wave.",
            daysAgo: 6,
          },
        ],
      },
    ],
  },
  {
    email: `leo${DEMO_DOMAIN}`,
    fullName: "Leo Park",
    petName: "Tapelo",
    music: {
      genres: ["lofi", "indie"],
      energy: 1,
      mood: 3,
      era: "20s",
      hoursPerDay: "over6",
      discovery: "playlists",
      topArtist: "Nujabes",
      anthem: "Feather",
    },
    applications: [
      {
        track: "volunteer",
        status: "under_review",
        createdDaysAgo: 9,
        submittedDaysAgo: 7,
        answers: about({
          school: "De Anza College",
          graduation_year: 2027,
          pronouns: "he/him",
          shirt_size: "m",
          needs: "Vegetarian.",
          shifts: ["fri_evening", "sat_morning", "sun_judging"],
          roles: ["checkin", "helpdesk", "floater"],
          physical_ok: true,
          why_volunteer:
            "I hacked last year and want to see the other side of the table. The check-in volunteers were the reason my first hour was calm instead of chaotic.",
        }),
        reviews: [
          {
            reviewer: "sam",
            scores: { reliability: 4, enthusiasm: 5, fit: 5 },
            overall: 4,
            notes: "Returning hacker who wants check-in. Three shifts including Friday kickoff, which we always need.",
            daysAgo: 4,
          },
        ],
      },
    ],
  },
  {
    email: `sofia${DEMO_DOMAIN}`,
    fullName: "Sofia Bianchi",
    petName: "Brava",
    music: {
      genres: ["rock", "metal"],
      energy: 5,
      mood: 3,
      era: "80s",
      hoursPerDay: "3to6",
      discovery: "live",
      topArtist: "Iron Maiden",
      anthem: "The Trooper",
    },
    applications: [
      {
        track: "mentor",
        status: "submitted",
        createdDaysAgo: 7,
        submittedDaysAgo: 5,
        answers: about({
          school: "Cloudflare",
          graduation_year: 2021,
          pronouns: "she/her",
          github: "https://github.com/sbianchi",
          shirt_size: "s",
          expertise: ["systems", "security", "web"],
          mentoring_style: "hands_on",
          past_mentoring:
            "I onboard new hires on our edge runtime team and ran a Rust study group at work for a year. At hackathons I am the person who sits down and reads the stack trace with you.",
          availability: ["sat_afternoon", "sat_night"],
          first_hackathon_advice:
            "Deploy on Friday night, even if it is a hello world. Every hour you spend on deployment on Sunday is an hour of demo you lose.",
        }),
      },
    ],
  },
  {
    email: `tariq${DEMO_DOMAIN}`,
    fullName: "Tariq Hassan",
    petName: "Solenne",
    music: {
      genres: ["pop", "rnb"],
      energy: 4,
      mood: 5,
      era: "10s",
      hoursPerDay: "under1",
      discovery: "friends",
      topArtist: "Dua Lipa",
      anthem: "Levitating",
    },
    applications: [
      {
        track: "judge",
        status: "rejected",
        createdDaysAgo: 14,
        submittedDaysAgo: 13,
        decidedDaysAgo: 6,
        answers: about({
          school: "Northstar Ventures",
          graduation_year: 2012,
          linkedin: "https://linkedin.com/in/tariqhassan",
          shirt_size: "xl",
          company: "Northstar Ventures",
          role: "Associate",
          expertise: ["product", "blockchain"],
          judging_experience:
            "I have been on the panel at a few pitch competitions and I meet a lot of founders. I mostly go on gut feel for whether the team can sell it.",
          availability: ["sat_afternoon"],
          conflicts:
            "We have invested in two Berkeley student startups whose founders may attend. I would still be comfortable judging their teams.",
        }),
        reviews: [
          {
            reviewer: "ari",
            scores: { expertise: 2, fairness: 1, availability: 1 },
            overall: 1,
            notes: "Not available for the Sunday judging block, and the conflict statement is disqualifying on its own.",
            daysAgo: 10,
          },
          {
            reviewer: "sam",
            scores: { expertise: 2, fairness: 2, availability: 1 },
            overall: 2,
            notes: "Gut-feel judging is the opposite of what we ask for. Pass this year.",
            daysAgo: 9,
          },
        ],
      },
    ],
  },
  {
    email: `nell${DEMO_DOMAIN}`,
    fullName: "Nell Kowalski",
    petName: "Marlow",
    music: {
      genres: ["country", "indie"],
      energy: 2,
      mood: 2,
      era: "90s",
      hoursPerDay: "1to3",
      discovery: "albums",
      topArtist: "Gillian Welch",
      anthem: "Look at Miss Ohio",
    },
    applications: [
      {
        track: "hacker",
        status: "draft",
        createdDaysAgo: 2,
        answers: about({
          school: "UC Davis",
          graduation_year: 2026,
          pronouns: "they/them",
          shirt_size: "l",
          needs: "I need step-free access.",
          experience_level: "beginner",
          first_hackathon: true,
        }),
      },
    ],
  },
];

function isDecision(status: Status): status is Decision {
  return status === "accepted" || status === "waitlisted" || status === "rejected";
}

function daysAgo(days: number, hour: number): string {
  const date = new Date();
  date.setUTCHours(hour, (days * 7) % 60, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function fail(step: string, error: { message: string } | null): never {
  throw new Error(`${step}: ${error?.message ?? "unknown error"}`);
}

async function deleteDemoUsers(): Promise<number> {
  let page = 1;
  const perPage = 200;
  const targets: User[] = [];
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) fail("listUsers", error);
    targets.push(...data.users.filter((user) => user.email?.endsWith(DEMO_DOMAIN)));
    if (data.users.length < perPage) break;
    page += 1;
  }
  for (const user of targets) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) fail(`deleteUser ${user.email}`, error);
  }
  return targets.length;
}

async function createUser(email: string, fullName: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) fail(`createUser ${email}`, error);
  return data.user.id;
}

/**
 * The profiles_protect_role trigger rejects role changes unless the caller is
 * already an organizer, and the service role has no auth.uid(). Replacing the
 * row sidesteps the update trigger.
 */
async function promoteToOrganizer(id: string, email: string, fullName: string): Promise<void> {
  const { error: deleteError } = await admin.from("profiles").delete().eq("id", id);
  if (deleteError) fail(`delete profile ${email}`, deleteError);
  const { error } = await admin
    .from("profiles")
    .insert({ id, email, full_name: fullName, role: "organizer" });
  if (error) fail(`insert organizer profile ${email}`, error);
}

function petFor(applicant: ApplicantSeed): PetSpec {
  let spec = applyXp(derivePet(applicant.music, applicant.petName), "petCreated");
  if (applicant.applications.length > 0) spec = applyXp(spec, "firstDraft");
  for (const application of applicant.applications) {
    for (const section of completion(application.track, application.answers).sectionsDone) {
      spec = applyXp(spec, "sectionComplete", `${application.track}/${section}`);
    }
    if (application.status !== "draft") spec = applyXp(spec, "submitted", application.track);
    if (isDecision(application.status)) spec = applyXp(spec, "decision", application.track);
  }
  return spec;
}

function petRow(userId: string, spec: PetSpec, createdAt: string): PetInsert {
  return {
    user_id: userId,
    name: spec.name,
    species: spec.species,
    palette: { ...spec.palette },
    traits: { ...spec.traits, xpEvents: spec.traits.xpEvents ?? [] },
    music: { ...spec.music, genres: [...spec.music.genres] },
    xp: spec.xp,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function applicationRow(userId: string, seed: ApplicationSeed): ApplicationInsert {
  const rubricKeys = FORM_DEFINITIONS[seed.track].rubric.map((criterion) => criterion.key);
  let answers: Answers = seed.answers;
  if (seed.status !== "draft") {
    const result = validateAnswers(seed.track, seed.answers);
    if (!result.ok) {
      throw new Error(
        `${seed.track} answers fail validation: ${JSON.stringify(result.fieldErrors)}`,
      );
    }
    answers = result.answers;
    if (seed.submittedDaysAgo === undefined) throw new Error(`${seed.track} needs submittedDaysAgo`);
  }
  if (isDecision(seed.status) && seed.decidedDaysAgo === undefined) {
    throw new Error(`${seed.track} needs decidedDaysAgo`);
  }
  for (const review of seed.reviews ?? []) {
    const keys = Object.keys(review.scores).sort();
    if (keys.join() !== [...rubricKeys].sort().join()) {
      throw new Error(`${seed.track} review scores do not match the rubric: ${keys.join(", ")}`);
    }
  }
  const submittedAt = seed.submittedDaysAgo === undefined ? null : daysAgo(seed.submittedDaysAgo, 18);
  const decidedAt = seed.decidedDaysAgo === undefined ? null : daysAgo(seed.decidedDaysAgo, 15);
  return {
    user_id: userId,
    track: seed.track,
    status: seed.status,
    answers: answers as Json,
    created_at: daysAgo(seed.createdDaysAgo, 10),
    updated_at: decidedAt ?? submittedAt ?? daysAgo(seed.createdDaysAgo, 11),
    submitted_at: submittedAt,
    decided_at: decidedAt,
  };
}

async function main() {
  const removed = await deleteDemoUsers();
  console.log(`Removed ${removed} existing demo user(s)`);

  const organizerIds = {} as Record<keyof typeof ORGANIZERS, string>;
  for (const [key, organizer] of Object.entries(ORGANIZERS) as [keyof typeof ORGANIZERS, OrganizerSeed][]) {
    const id = await createUser(organizer.email, organizer.fullName);
    await promoteToOrganizer(id, organizer.email, organizer.fullName);
    organizerIds[key] = id;
  }

  const counts = { applicants: 0, applications: 0, reviews: 0, pets: 0 };
  for (const applicant of APPLICANTS) {
    const userId = await createUser(applicant.email, applicant.fullName);
    counts.applicants += 1;

    const earliest = Math.max(...applicant.applications.map((application) => application.createdDaysAgo), 0) + 1;
    const { error: petError } = await admin.from("pets").insert(petRow(userId, petFor(applicant), daysAgo(earliest, 9)));
    if (petError) fail(`insert pet for ${applicant.email}`, petError);
    counts.pets += 1;

    for (const seed of applicant.applications) {
      const { data: application, error } = await admin
        .from("applications")
        .insert(applicationRow(userId, seed))
        .select("id")
        .single();
      if (error || !application) fail(`insert ${seed.track} application for ${applicant.email}`, error);
      counts.applications += 1;

      const reviews: ReviewInsert[] = (seed.reviews ?? []).map((review) => ({
        application_id: application.id,
        reviewer_id: organizerIds[review.reviewer],
        scores: review.scores,
        overall: review.overall,
        notes: review.notes,
        created_at: daysAgo(review.daysAgo, 14),
        updated_at: daysAgo(review.daysAgo, 14),
      }));
      if (reviews.length > 0) {
        const { error: reviewError } = await admin.from("reviews").insert(reviews);
        if (reviewError) fail(`insert reviews for ${applicant.email}`, reviewError);
        counts.reviews += reviews.length;
      }
    }
  }

  console.log(
    `Seeded ${counts.applicants} applicants, ${counts.pets} roadies, ${counts.applications} applications, ${counts.reviews} reviews`,
  );
  console.log("");
  console.log("Demo credentials");
  console.log(`  password (all accounts): ${PASSWORD}`);
  console.log(`  organizer: ${ORGANIZERS.ari.email}`);
  console.log(`  organizer: ${ORGANIZERS.sam.email}`);
  for (const applicant of APPLICANTS) {
    console.log(`  applicant: ${applicant.email} (${applicant.fullName})`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
