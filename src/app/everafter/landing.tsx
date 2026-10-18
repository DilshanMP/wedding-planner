"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarHeart, Languages, MailOpen, Music2, Palette, QrCode, Share2, Sparkles, Users } from "lucide-react";
import { TEMPLATES } from "@/lib/domain/invite-studio";
import { demoContent, demoDesign } from "@/lib/domain/invite-demo";
import { InvitationExperience } from "@/components/invite/invitation-experience";
import { InviteCard } from "@/components/invite/invite-card";

const STEPS = [
  { n: "01", title: "Choose a design", text: "Eight original templates — from ivory and champagne to Kandyan gold and black tie." },
  { n: "02", title: "Make it yours", text: "Names, date, venue, Sinhala or English wording, your photo, colours, fonts and the wax seal." },
  { n: "03", title: "Publish & share", text: "A private link, a QR code and a WhatsApp message — ready in one tap." },
  { n: "04", title: "Collect replies", text: "Guests reply inside the invitation. You see every RSVP and wish in one place." },
];

const FEATURES = [
  { icon: MailOpen, title: "A real envelope", text: "Layered paper, a breaking wax seal, a 3D flap and the card rising out — not a slideshow." },
  { icon: Languages, title: "සිංහල & English", text: "Wording ideas in Sinhala, English or both — formal or modern, short or detailed." },
  { icon: Palette, title: "Smart colours", text: "Pick one wedding colour and get a matching envelope, card, ink and florals." },
  { icon: Music2, title: "Music & motion", text: "An original music-box melody, falling petals or gold dust, at the speed you choose." },
  { icon: CalendarHeart, title: "Countdown & calendar", text: "Live countdown, Google Maps directions and one-tap calendar for every guest." },
  { icon: Users, title: "RSVP dashboard", text: "Who's coming, how many, and their wishes — private to the two of you." },
  { icon: QrCode, title: "QR & WhatsApp", text: "Print the QR on your paper cards; send the link on WhatsApp." },
  { icon: Sparkles, title: "Canva-ready", text: "Download print files (PNG, SVG, PDF) or send the card straight to your Canva account." },
];

export function EverAfterLanding() {
  const [demo, setDemo] = useState("ivory-champagne");
  const [replay, setReplay] = useState(0);
  const content = demoContent();
  return (
    <div className="ev">
      <header className="ev-nav">
        <Link href="/everafter" className="ev-logo"><span>EverAfter</span> Studio</Link>
        <nav aria-label="Sections">
          <a href="#templates">Templates</a>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
        </nav>
        <Link href="/invitations/new" className="ev-btn ev-btn--sm">Create</Link>
      </header>

      <section className="ev-hero">
        <div className="ev-hero-text">
          <p className="ev-over">Luxury animated wedding invitations</p>
          <h1>An invitation they&apos;ll open like a love letter.</h1>
          <p className="ev-lead">Your guests receive a sealed envelope with your monogram. One tap breaks the wax seal, the flap turns back, and your card rises into their hands — with music, your story, and a reply button.</p>
          <div className="ev-ctas">
            <Link href="/invitations/new" className="ev-btn">Create Your Invitation <ArrowRight aria-hidden="true" /></Link>
            <a href="#templates" className="ev-btn ev-btn--ghost">See the designs</a>
          </div>
          <p className="ev-small">Free to design · Sinhala & English · Works on every phone</p>
        </div>
        <div className="ev-hero-demo">
          <div className="ev-phone">
            <div className="ev-phone-screen">
              <InvitationExperience key={`${demo}-${replay}`} content={content} design={demoDesign(demo)} framed silent />
            </div>
          </div>
          <div className="ev-demo-picker" role="group" aria-label="Try a design">
            {TEMPLATES.slice(0, 6).map((t) => (
              <button key={t.id} type="button" aria-pressed={demo === t.id} title={t.name} onClick={() => { setDemo(t.id); setReplay((n) => n + 1); }}
                style={{ background: `linear-gradient(135deg, ${t.design.colors.envelope} 50%, ${t.design.colors.seal} 50%)` }}>
                <span className="sr-only">{t.name}</span>
              </button>
            ))}
            <button type="button" className="ev-replay" onClick={() => setReplay((n) => n + 1)}>Replay</button>
          </div>
        </div>
      </section>

      <section id="templates" className="ev-section">
        <p className="ev-over">The collection</p>
        <h2>Eight original designs</h2>
        <p className="ev-lead">Each with its own envelope, card, typography, florals and opening animation. Change anything later.</p>
        <div className="ev-gallery">
          {TEMPLATES.map((t) => (
            <Link key={t.id} href={`/invitations/new?template=${t.id}`} className="ev-tpl" style={{ background: t.design.colors.background }}>
              <span className="ev-tpl-env" style={{ background: t.design.colors.envelope }} aria-hidden="true">
                <span className="ev-tpl-flap" style={{ background: t.design.colors.envelope }} />
                <span className="ev-tpl-seal" style={{ background: t.design.colors.seal }} />
              </span>
              <span className="ev-tpl-card"><InviteCard content={content} design={demoDesign(t.id)} className="ev-tpl-svg" /></span>
              <span className="ev-tpl-meta">
                <b>{t.name}</b>
                <small>{t.tagline}</small>
                <span className="ev-tags">{t.mood.map((m) => <i key={m}>{m}</i>)}{t.animated ? <i>Animated</i> : <i>Static</i>}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="ev-section ev-section--tint">
        <p className="ev-over">How it works</p>
        <h2>From idea to every guest&apos;s phone</h2>
        <ol className="ev-steps">
          {STEPS.map((s) => <li key={s.n}><span>{s.n}</span><b>{s.title}</b><p>{s.text}</p></li>)}
        </ol>
      </section>

      <section id="features" className="ev-section">
        <p className="ev-over">Thoughtfully made</p>
        <h2>Everything a Sri Lankan wedding needs</h2>
        <div className="ev-features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="ev-feature"><Icon aria-hidden="true" /><b>{title}</b><p>{text}</p></div>
          ))}
        </div>
      </section>

      <section className="ev-cta">
        <h2>Begin your EverAfter.</h2>
        <p>Design it tonight. Send it tomorrow.</p>
        <Link href="/invitations/new" className="ev-btn">Create Your Invitation <Share2 aria-hidden="true" /></Link>
      </section>

      <footer className="ev-footer">
        <span>EverAfter Studio · part of <Link href="/">Poruwa Planner</Link></span>
        <span>Your invitations and replies stay private to you.</span>
      </footer>
    </div>
  );
}
