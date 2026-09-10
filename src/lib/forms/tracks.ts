import type { Track } from "@/lib/types";

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "url"
  | "number";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** One sentence the Roadie rephrases in its own tone when the field is focused. */
  hint: string;
  placeholder?: string;
  options?: FieldOption[];
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface Section {
  key: string;
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface Criterion {
  key: string;
  label: string;
  description: string;
}

export interface FormDefinition {
  track: Track;
  title: string;
  blurb: string;
  sections: Section[];
  rubric: Criterion[];
}

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

const SHIRT_SIZES: FieldOption[] = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "2XL" },
];

const EXPERTISE_AREAS: FieldOption[] = [
  { value: "web", label: "Web and full-stack" },
  { value: "mobile", label: "Mobile" },
  { value: "ml", label: "Machine learning and AI" },
  { value: "data", label: "Data engineering" },
  { value: "systems", label: "Systems and infrastructure" },
  { value: "security", label: "Security" },
  { value: "hardware", label: "Hardware and embedded" },
  { value: "design", label: "Product design and UX" },
  { value: "product", label: "Product and business" },
  { value: "blockchain", label: "Blockchain" },
  { value: "games", label: "Games and graphics" },
  { value: "health", label: "Health and biotech" },
];

const EVENT_SLOTS: FieldOption[] = [
  { value: "fri_evening", label: "Friday evening (kickoff, 6 to 10pm)" },
  { value: "sat_morning", label: "Saturday morning (8am to noon)" },
  { value: "sat_afternoon", label: "Saturday afternoon (noon to 6pm)" },
  { value: "sat_night", label: "Saturday night (6pm to midnight)" },
  { value: "sun_morning", label: "Sunday morning (8am to noon)" },
  { value: "sun_judging", label: "Sunday judging and closing (noon to 5pm)" },
];

const aboutYou: Section = {
  key: "about",
  title: "About you",
  description: "Who you are and how to reach you. Shared across every track.",
  fields: [
    {
      key: "school",
      label: "School",
      type: "text",
      required: true,
      hint: "The full name of your school, or your employer if you have graduated.",
      placeholder: "UC Berkeley",
      maxLength: 120,
    },
    {
      key: "graduation_year",
      label: "Graduation year",
      type: "number",
      required: true,
      hint: "The year you expect to graduate; if you already have, put the year you did.",
      placeholder: "2027",
      min: 2000,
      max: 2034,
    },
    {
      key: "pronouns",
      label: "Pronouns",
      type: "text",
      required: false,
      hint: "Optional, so we get it right on your badge.",
      placeholder: "she/her",
      maxLength: 40,
    },
    {
      key: "github",
      label: "GitHub",
      type: "url",
      required: false,
      hint: "A link to your GitHub profile helps reviewers see real code, so include it if you have one.",
      placeholder: "https://github.com/you",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      type: "url",
      required: false,
      hint: "Optional, useful if your work history is not on GitHub.",
      placeholder: "https://linkedin.com/in/you",
    },
    {
      key: "portfolio",
      label: "Portfolio or personal site",
      type: "url",
      required: false,
      hint: "Anything that shows your work: a site, a demo reel, a paper, a blog.",
      placeholder: "https://you.dev",
    },
    {
      key: "needs",
      label: "Dietary or accessibility needs",
      type: "textarea",
      required: false,
      hint: "Tell us anything we should plan for, like food restrictions, mobility, or a quiet room.",
      placeholder: "Vegetarian; I use a wheelchair and need step-free access.",
      maxLength: 500,
    },
    {
      key: "shirt_size",
      label: "Shirt size",
      type: "select",
      required: true,
      hint: "Unisex sizing, pick the one you actually wear.",
      options: SHIRT_SIZES,
    },
  ],
};

const hackerForm: FormDefinition = {
  track: "hacker",
  title: "Hacker application",
  blurb:
    "Thirty-six hours, a team of up to four, and something you can demo on Sunday. We read every application.",
  sections: [
    aboutYou,
    {
      key: "experience",
      title: "Experience",
      description: "There is no minimum. We want a mix of first-timers and veterans.",
      fields: [
        {
          key: "experience_level",
          label: "Experience level",
          type: "select",
          required: true,
          hint: "Be honest here; we balance teams and beginners get extra mentor time.",
          options: [
            { value: "beginner", label: "Beginner: I have written a little code" },
            { value: "intermediate", label: "Intermediate: I have shipped a project or two" },
            { value: "advanced", label: "Advanced: I build things regularly" },
            { value: "pro", label: "Professional: I do this for a living" },
          ],
        },
        {
          key: "first_hackathon",
          label: "This is my first hackathon",
          type: "checkbox",
          required: false,
          hint: "Check this if you have never been to a hackathon; about a third of attendees are first-timers.",
        },
        {
          key: "skills",
          label: "Skills",
          type: "multiselect",
          required: true,
          hint: "Pick what you can actually contribute this weekend, not everything you have touched once.",
          options: [
            { value: "frontend", label: "Frontend" },
            { value: "backend", label: "Backend" },
            { value: "mobile", label: "Mobile" },
            { value: "ml", label: "Machine learning" },
            { value: "data", label: "Data and analytics" },
            { value: "hardware", label: "Hardware" },
            { value: "design", label: "Design" },
            { value: "pm", label: "Product and pitching" },
            { value: "devops", label: "DevOps and cloud" },
            { value: "security", label: "Security" },
          ],
        },
        {
          key: "proud_project",
          label: "A project you are proud of",
          type: "textarea",
          required: true,
          hint: "Describe one thing you made, what was hard about it, and what you would change now; a school assignment counts.",
          placeholder:
            "Last spring I built a CLI that syncs my class schedule to Google Calendar. The hard part was parsing the registrar's HTML...",
          maxLength: 1500,
        },
      ],
    },
    {
      key: "plan",
      title: "Your plan",
      description: "A rough idea is enough. Most teams change direction on Friday night anyway.",
      fields: [
        {
          key: "build_idea",
          label: "What do you want to build?",
          type: "textarea",
          required: true,
          hint: "A sentence or two on the problem and who it is for beats a feature list.",
          placeholder:
            "A tool that turns lecture recordings into flashcards, for students who learn by review...",
          maxLength: 1200,
        },
        {
          key: "team_status",
          label: "Team status",
          type: "select",
          required: true,
          hint: "We run team formation Friday night, so coming solo is completely fine.",
          options: [
            { value: "solo", label: "Solo, looking for a team" },
            { value: "partial", label: "Have some teammates, open to more" },
            { value: "full", label: "Full team of four" },
          ],
        },
        {
          key: "why_encore",
          label: "Why this hackathon?",
          type: "textarea",
          required: true,
          hint: "Tell us what you hope to leave with on Sunday, whether a demo, a team, or a skill.",
          placeholder: "I want to ship something end to end with people I have never met...",
          maxLength: 1000,
        },
      ],
    },
  ],
  rubric: [
    {
      key: "technical_depth",
      label: "Technical depth",
      description:
        "Does the project story show real understanding of what they built and why it was hard?",
    },
    {
      key: "motivation",
      label: "Motivation",
      description: "Is there a clear reason they want to be here and something they want to make?",
    },
    {
      key: "collaboration",
      label: "Collaboration",
      description: "Would they be a good teammate: open to a team, realistic about skills, generous with credit?",
    },
  ],
};

const judgeForm: FormDefinition = {
  track: "judge",
  title: "Judge application",
  blurb:
    "Judges see six to ten demos in the final round and score them on the same rubric. We need people who can ask a sharp question kindly.",
  sections: [
    aboutYou,
    {
      key: "background",
      title: "Background",
      fields: [
        {
          key: "company",
          label: "Company or organization",
          type: "text",
          required: true,
          hint: "Where you work now, or your lab or school if you are in academia.",
          placeholder: "Stripe",
          maxLength: 120,
        },
        {
          key: "role",
          label: "Role",
          type: "text",
          required: true,
          hint: "Your current title, plain words are fine.",
          placeholder: "Staff engineer, payments infrastructure",
          maxLength: 120,
        },
        {
          key: "expertise",
          label: "Areas of expertise",
          type: "multiselect",
          required: true,
          hint: "Pick the areas where you could tell a strong project from a slick demo.",
          options: EXPERTISE_AREAS,
        },
        {
          key: "judging_experience",
          label: "Judging experience",
          type: "textarea",
          required: true,
          hint: "Past hackathons, grant panels, or design reviews all count; if this is your first time say so and tell us how you evaluate work.",
          placeholder: "I judged the final round at Cal Hacks 10 and sit on our internal design review board...",
          maxLength: 1200,
        },
      ],
    },
    {
      key: "logistics",
      title: "Logistics",
      fields: [
        {
          key: "availability",
          label: "Availability",
          type: "multiselect",
          required: true,
          hint: "Judging is Sunday afternoon; the other slots are optional office hours with teams.",
          options: EVENT_SLOTS,
        },
        {
          key: "conflicts",
          label: "Conflict of interest statement",
          type: "textarea",
          required: true,
          hint: "List anyone you know who might attend, teams you have advised, or companies you have a stake in; write none if that is the case.",
          placeholder: "My cousin is a sophomore at Berkeley and may apply as a hacker. No other conflicts.",
          maxLength: 800,
        },
      ],
    },
  ],
  rubric: [
    {
      key: "expertise",
      label: "Expertise",
      description: "Depth in at least one area teams will actually build in, and range to evaluate the rest.",
    },
    {
      key: "fairness",
      label: "Fairness",
      description: "Evidence they can score consistently, disclose conflicts, and separate polish from substance.",
    },
    {
      key: "availability",
      label: "Availability",
      description: "Covers the Sunday judging block and ideally one office-hours slot.",
    },
  ],
};

const mentorForm: FormDefinition = {
  track: "mentor",
  title: "Mentor application",
  blurb:
    "Mentors roam the floor and take help-desk tickets. Most of the job is unblocking a stuck team in ten minutes and then leaving them to it.",
  sections: [
    aboutYou,
    {
      key: "expertise",
      title: "Expertise",
      fields: [
        {
          key: "expertise",
          label: "Areas of expertise",
          type: "multiselect",
          required: true,
          hint: "Choose the stacks you could debug at 2am with a stranger's laptop.",
          options: EXPERTISE_AREAS,
        },
        {
          key: "mentoring_style",
          label: "Mentoring style",
          type: "select",
          required: true,
          hint: "There is no wrong answer; we pair styles to team requests.",
          options: [
            { value: "hands_on", label: "Hands on: pair and write code with the team" },
            { value: "socratic", label: "Socratic: ask questions until they find it" },
            { value: "whiteboard", label: "Whiteboard: help them shape the design, then step back" },
            { value: "cheerleader", label: "Coach: keep morale and scope in check" },
          ],
        },
        {
          key: "past_mentoring",
          label: "Past mentoring",
          type: "textarea",
          required: true,
          hint: "Tell us about a time you helped someone get unstuck, at a hackathon or anywhere else.",
          placeholder: "I ran the help desk at TreeHacks last year and TA'd CS 61B for two semesters...",
          maxLength: 1200,
        },
      ],
    },
    {
      key: "logistics",
      title: "Logistics",
      fields: [
        {
          key: "availability",
          label: "Availability",
          type: "multiselect",
          required: true,
          hint: "Saturday night is when teams need help most, so if you can take that slot say so.",
          options: EVENT_SLOTS,
        },
      ],
    },
    {
      key: "advice",
      title: "Advice",
      fields: [
        {
          key: "first_hackathon_advice",
          label: "What do you wish someone had told you at your first hackathon?",
          type: "textarea",
          required: true,
          hint: "One honest paragraph; we print the best ones in the welcome packet.",
          placeholder: "Cut the scope in half on Friday night, then cut it again Saturday morning...",
          maxLength: 1000,
        },
      ],
    },
  ],
  rubric: [
    {
      key: "expertise",
      label: "Expertise",
      description: "Can they debug real problems across the stacks teams use most?",
    },
    {
      key: "communication",
      label: "Communication",
      description: "Do they explain clearly, listen first, and leave the team owning the solution?",
    },
    {
      key: "availability",
      label: "Availability",
      description: "Covers at least two slots, with credit for Saturday night.",
    },
  ],
};

const volunteerForm: FormDefinition = {
  track: "volunteer",
  title: "Volunteer application",
  blurb:
    "Volunteers run check-in, food, the help desk queue, and the closing ceremony. You get a shirt, meals, and the best view of the demos.",
  sections: [
    aboutYou,
    {
      key: "availability",
      title: "Availability",
      description: "Shifts are four to six hours. Pick every one you could work, and we will schedule at most three.",
      fields: [
        {
          key: "shifts",
          label: "Shifts",
          type: "multiselect",
          required: true,
          hint: "Pick all shifts you could work; we will never schedule you for more than three.",
          options: EVENT_SLOTS,
        },
      ],
    },
    {
      key: "role",
      title: "Role",
      fields: [
        {
          key: "roles",
          label: "Roles you are interested in",
          type: "multiselect",
          required: true,
          hint: "Pick what sounds fun; nobody gets stuck on one role all weekend.",
          options: [
            { value: "checkin", label: "Check-in and badges" },
            { value: "food", label: "Food and snacks" },
            { value: "helpdesk", label: "Help desk queue" },
            { value: "logistics", label: "Setup and teardown" },
            { value: "media", label: "Photo and social media" },
            { value: "judging", label: "Judging logistics" },
            { value: "floater", label: "Floater, wherever needed" },
          ],
        },
        {
          key: "physical_ok",
          label: "I can be on my feet for a shift and lift up to 25 pounds",
          type: "checkbox",
          required: true,
          hint: "Setup involves moving tables and water cases, so we ask everyone to confirm this.",
        },
        {
          key: "why_volunteer",
          label: "Why do you want to volunteer?",
          type: "textarea",
          required: true,
          hint: "A couple of sentences on what draws you to the event is plenty.",
          placeholder: "I hacked last year and want to see the other side of the table...",
          maxLength: 800,
        },
      ],
    },
  ],
  rubric: [
    {
      key: "reliability",
      label: "Reliability",
      description: "Clear availability, realistic about shifts, and evidence they show up.",
    },
    {
      key: "enthusiasm",
      label: "Enthusiasm",
      description: "Do they actually want to be here, or just want the shirt?",
    },
    {
      key: "fit",
      label: "Fit",
      description: "Interests line up with roles we need to fill.",
    },
  ],
};

export const FORM_DEFINITIONS: Record<Track, FormDefinition> = {
  hacker: hackerForm,
  judge: judgeForm,
  mentor: mentorForm,
  volunteer: volunteerForm,
};

export function getFormDefinition(track: Track): FormDefinition {
  return FORM_DEFINITIONS[track];
}

export function allFields(track: Track): FieldDef[] {
  return FORM_DEFINITIONS[track].sections.flatMap((section) => section.fields);
}

export function findField(track: Track, key: string): FieldDef | undefined {
  return allFields(track).find((field) => field.key === key);
}
