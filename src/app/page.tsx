import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Code2, Gavel, GraduationCap, Handshake } from "lucide-react";
import { getCurrentUser, HOME_BY_ROLE } from "@/lib/data/profiles";
import { Wordmark } from "@/components/shell/Wordmark";
import { EncoreScene } from "@/components/landing/EncoreScene";
import { GUIDES } from "@/lib/pet/guides";
import { PixelPortrait } from "@/components/pet/PixelPortrait";
import "./landing.css";

export const metadata: Metadata = { title: "Encore — Make something worth staying up for", description: "Apply to Hackathon at Berkeley with Eddy, Gary, Eric, or a guide of your own by your side." };
const ROLES = [
  { name: "Hacker", icon: Code2, copy: "Make your what-if real.", color: "#8b93ea" },
  { name: "Judge", icon: Gavel, copy: "Give great ideas their moment.", color: "#c79af5" },
  { name: "Mentor", icon: GraduationCap, copy: "Help someone find the way.", color: "#5cc3d1" },
  { name: "Volunteer", icon: Handshake, copy: "Make the weekend happen.", color: "#e6957f" },
];
export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(HOME_BY_ROLE[user.role]);
  return <main className="encore-landing">
    <header className="encore-nav"><Link href="/" aria-label="Encore home"><Wordmark size="lg" /></Link><nav aria-label="Main navigation"><a href="#your-guides">Your guides</a><Link href="/sign-in">Sign in</Link><Link href="/sign-up" className="encore-button encore-button-small">Apply <ArrowUpRight size={16} /></Link></nav></header>
    <section className="encore-hero" aria-labelledby="hero-heading">
      <div className="encore-copy"><p className="encore-eyebrow"><span /> HACKATHON AT BERKELEY / FALL 2026</p><h1 id="hero-heading">Make something<br /><em>worth staying up for.</em></h1><p>A weekend for the idea in your notes app.<br />And the people who’ll help you bring it to life.</p><div className="encore-actions"><Link href="/sign-up" className="encore-button">Start your application <ArrowUpRight size={18} /></Link><a href="#your-guides" className="encore-secondary">Find your guide <span>↓</span></a></div></div>
      <EncoreScene />
    </section>
    <section className="encore-roles" aria-labelledby="roles-heading"><div className="encore-section-label"><span>01 / FIND YOUR PART</span><h2 id="roles-heading">A good weekend takes all kinds.</h2></div><div className="encore-role-grid">{ROLES.map(({ name, icon: Icon, copy, color }) => <Link key={name} href={`/sign-up?track=${name.toLowerCase()}`}><Icon size={24} style={{ color }} aria-hidden /><h3>{name}<ArrowUpRight size={18} /></h3><p>{copy}</p></Link>)}</div></section>
    <section id="your-guides" className="encore-guides" aria-labelledby="guides-heading"><div className="encore-guide-heading"><div className="encore-section-label"><span>02 / BRING SOME COMPANY</span><h2 id="guides-heading">A familiar face.<br />From start to submit.</h2></div><p>Eddy, Gary, and Eric will walk you through the application. Pick your person—or draw a character or make a pixelated selfie your guide.</p></div><div className="encore-guide-grid">{GUIDES.map((guide, i) => <article key={guide.id}><div className="encore-guide-art"><span>PLAYER 0{i + 1}</span><PixelPortrait src={guide.image} name={guide.name} size={180} /></div><div className="encore-guide-info"><h3>{guide.name}{guide.id === "eddy" && <small>aka Edward</small>}</h3><p>{guide.line}</p></div></article>)}</div><div className="encore-custom-guide"><span>✎</span><div><h3>More of a main-character person?</h3><p>Draw your own guide, take a photo, or upload one. Make it yours.</p></div><Link href={`/sign-up?next=${encodeURIComponent("/app/roadie?next=/app/apply/hacker")}`}>Choose your guide <ArrowUpRight size={18} /></Link></div></section>
    <section className="encore-closing"><p className="encore-eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>See what you can make.</h2><Link href="/sign-up" className="encore-button">Apply to the hackathon <ArrowUpRight size={18} /></Link></section>
    <footer className="encore-footer"><Wordmark size="md" /><span>Hackathon at Berkeley · Fall 2026</span><Link href="/sign-in">Already started? Sign in ↗</Link></footer>
  </main>;
}
