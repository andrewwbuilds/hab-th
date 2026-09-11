import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Aleo } from "next/font/google";
import { ArrowUpRight, Code2, Gavel, GraduationCap, Handshake } from "lucide-react";
import { getCurrentUser, HOME_BY_ROLE } from "@/lib/data/profiles";
import { Wordmark } from "@/components/shell/Wordmark";
import { EncoreScene } from "@/components/landing/EncoreScene";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { HalftoneSkyline } from "@/components/landing/HalftoneSkyline";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingNav } from "@/components/landing/LandingNav";
import { GUIDES } from "@/lib/pet/guides";
import { PixelPortrait } from "@/components/pet/PixelPortrait";
import "./landing.css";

const aleo = Aleo({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Encore — Make something worth staying up for",
  description: "Apply to Hackathon at Berkeley with Eddy, Gary, Eric, or a guide of your own by your side.",
};

const ROLES = [
  { name: "Hacker", icon: Code2, copy: "Make your what-if real.", color: "#8b93ea" },
  { name: "Judge", icon: Gavel, copy: "Give great ideas their moment.", color: "#c79af5" },
  { name: "Mentor", icon: GraduationCap, copy: "Help someone find the way.", color: "#5cc3d1" },
  { name: "Volunteer", icon: Handshake, copy: "Make the weekend happen.", color: "#e6957f" },
];

const FACTS = [
  { value: "36 hours", label: "of building" },
  { value: "Up to 4", label: "people per team" },
  { value: "Friday 6pm", label: "kickoff" },
  { value: "Sunday", label: "demos and judging" },
];

function Cross({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  return <i aria-hidden className="encore-cross" data-pos={position} />;
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(HOME_BY_ROLE[user.role]);

  return (
    <main className={`encore-landing ${aleo.variable}`}>
      <LandingNav />

      <section className="encore-hero" aria-labelledby="hero-heading">
        <div className="encore-copy">
          <p className="encore-eyebrow">
            <span /> HACKATHON AT BERKELEY / FALL 2026
          </p>
          <h1 id="hero-heading">
            <span className="encore-serif">Make something</span>
            <br />
            worth staying up for.
          </h1>
          <p>
            A weekend for the idea in your notes app.
            <br />
            And the people who’ll help you bring it to life.
          </p>
          <div className="encore-actions">
            <Link href="/sign-up" className="encore-button">
              Start your application <ArrowUpRight size={16} />
            </Link>
            <a href="#how-it-works" className="encore-button encore-button-outline">
              How it works
            </a>
          </div>
        </div>
        <div className="encore-stage">
          <HalftoneSkyline className="encore-halftone" />
          <EncoreScene />
        </div>
      </section>

      <section className="encore-facts" aria-label="The weekend at a glance">
        <p className="encore-facts-label">The weekend</p>
        {FACTS.map((fact) => (
          <p key={fact.value} className="encore-fact">
            <strong>{fact.value}</strong>
            <span>{fact.label}</span>
          </p>
        ))}
        <p className="encore-facts-note">Coming solo? Team formation is Friday night.</p>
        <Cross position="tl" />
        <Cross position="tr" />
        <Cross position="bl" />
        <Cross position="br" />
      </section>

      <section className="encore-section encore-problem" aria-labelledby="problem-heading">
        <div className="encore-problem-art" aria-hidden>
          <HalftoneSkyline className="encore-problem-halftone" seed={19} rise={0.7} />
          <div className="mock-window mock-blank">
            <p className="mock-label">Why do you want to come to Hackathon at Berkeley?</p>
            <div className="mock-textarea">
              <span className="mock-caret" />
            </div>
            <p className="mock-count">0 / 1200</p>
            <p className="mock-label">What have you built before?</p>
            <div className="mock-textarea mock-textarea-short" />
          </div>
        </div>
        <div>
          <p className="encore-kicker">The problem.</p>
          <h2 id="problem-heading" className="encore-heading">
            <span className="encore-serif">Applications ask a lot,</span> and explain very little.
          </h2>
          <dl className="encore-problem-points">
            <div>
              <dt>The blank box</dt>
              <dd>Long questions and no sense of what a good answer looks like. So the tab stays open for a week.</dd>
            </div>
            <div>
              <dt>The long silence</dt>
              <dd>You press submit and hear nothing. Did it go through? Is anyone reading it?</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="how-it-works" className="encore-section" aria-labelledby="how-heading">
        <div className="encore-section-head">
          <p className="encore-kicker">How it works.</p>
          <h2 id="how-heading" className="encore-heading">
            <span className="encore-serif">Three steps, and</span> someone in your corner for each.
          </h2>
        </div>
        <HowItWorks />
      </section>

      <section className="encore-section encore-roles" aria-labelledby="roles-heading">
        <div className="encore-section-head">
          <p className="encore-kicker">Find your part.</p>
          <h2 id="roles-heading" className="encore-heading">
            <span className="encore-serif">A good weekend</span> takes all kinds.
          </h2>
        </div>
        <div className="encore-role-grid">
          {ROLES.map(({ name, icon: Icon, copy, color }) => (
            <Link key={name} href={`/sign-up?track=${name.toLowerCase()}`}>
              <Icon size={24} style={{ color }} aria-hidden />
              <h3>
                {name}
                <ArrowUpRight size={18} />
              </h3>
              <p>{copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="encore-section" aria-labelledby="features-heading">
        <div className="encore-section-head encore-section-head-center">
          <p className="encore-kicker">Built for the night before the deadline.</p>
          <h2 id="features-heading" className="encore-heading">
            <span className="encore-serif">An application that</span> works with you.
          </h2>
        </div>
        <Features />
      </section>

      <section id="your-guides" className="encore-section encore-guides" aria-labelledby="guides-heading">
        <div className="encore-guide-heading">
          <div className="encore-section-head">
            <p className="encore-kicker">Bring some company.</p>
            <h2 id="guides-heading" className="encore-heading">
              <span className="encore-serif">A familiar face.</span>
              <br />
              From start to submit.
            </h2>
          </div>
          <p>
            Eddy, Gary, and Eric will walk you through the application. Pick your person, or draw a character or make a
            pixelated selfie your guide.
          </p>
        </div>
        <div className="encore-guide-grid">
          {GUIDES.map((guide, i) => (
            <article key={guide.id}>
              <div className="encore-guide-art">
                <span className="encore-guide-label">PLAYER 0{i + 1}</span>
                <PixelPortrait src={guide.image} name={guide.name} size={200} />
              </div>
              <div className="encore-guide-info">
                <h3>
                  {guide.name}
                  {guide.id === "eddy" && <small>aka Edward</small>}
                </h3>
                <p>{guide.line}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="encore-custom-guide">
          <span>✎</span>
          <div>
            <h3>More of a main-character person?</h3>
            <p>Draw your own guide, take a photo, or upload one. Make it yours.</p>
          </div>
          <Link href={`/sign-up?next=${encodeURIComponent("/app/roadie?next=/app/apply/hacker")}`}>
            Choose your guide <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      <section id="faq" className="encore-cta" aria-labelledby="cta-heading">
        <div className="encore-cta-inner">
          <p className="encore-kicker">Any questions?</p>
          <h2 id="cta-heading" className="encore-heading encore-heading-lg">
            <span className="encore-serif">Stop rereading the prompt.</span>
            <br />
            Start your application.
          </h2>
          <div className="encore-actions encore-actions-start">
            <Link href="/sign-up" className="encore-button">
              Apply to the hackathon <ArrowUpRight size={16} />
            </Link>
            <Link href="/sign-in" className="encore-button encore-button-outline">
              I already applied
            </Link>
          </div>
          <Faq />
        </div>
      </section>

      <footer className="encore-footer">
        <div className="encore-footer-brand">
          <Wordmark size="md" />
          <p>Hackathon applications, reviewed with care.</p>
        </div>
        <nav aria-label="Footer" className="encore-footer-nav">
          <div>
            <h3>Apply</h3>
            {ROLES.map(({ name }) => (
              <Link key={name} href={`/sign-up?track=${name.toLowerCase()}`}>
                Apply as a {name.toLowerCase()}
              </Link>
            ))}
          </div>
          <div>
            <h3>Encore</h3>
            <a href="#how-it-works">How it works</a>
            <a href="#your-guides">Guides</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <h3>Account</h3>
            <Link href="/sign-in">Already started? Sign in</Link>
            <Link href="/sign-up">Create an account</Link>
          </div>
        </nav>
        <p className="encore-footer-base">
          <span>Hackathon at Berkeley · Fall 2026</span>
          <span>Built for applicants, reviewed by people</span>
        </p>
      </footer>
    </main>
  );
}
