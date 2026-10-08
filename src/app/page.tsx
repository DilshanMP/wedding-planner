import Link from "next/link";
import { CalendarClock, Check, Scale, Sparkles, Store, SunMedium, Users, Wallet } from "lucide-react";
import { JasmineMark, LotusMark, PoruwaMark } from "@/components/ui/primitives";
import { LandingCta } from "./landing-cta";

const JOURNEY = ["Vision", "Budget", "Venue", "Guest Planning", "Vendors", "Ceremony", "Reception", "Attire", "Invitations", "Final Preparation", "Wedding Day", "Post Wedding"];

const FEATURES = [
  { icon: Wallet, title: "Budget intelligence", body: "See committed, paid and projected spend against your original plan. Plain-language guidance like “Decoration is 14% above plan” comes with the options to fix it." },
  { icon: Users, title: "Guest management", body: "Bride and groom sides, families, couples and groups. Track invitations and RSVPs by the person, not the card, and know your expected attendance." },
  { icon: Store, title: "Vendor management", body: "Compare quotes on true cost, with overtime, transport and taxes surfaced. A transparent Value Score. The cheapest option is never chosen for you." },
  { icon: Scale, title: "Self-plan vs planner", body: "Put a planner's quotation beside your own estimate, category by category, and decide where their help is worth it." },
  { icon: CalendarClock, title: "Timelines", body: "A planning timeline dated from your wedding day, and an editable wedding-day schedule from bride preparation to going-away." },
  { icon: SunMedium, title: "Wedding Day Mode", body: "A calm command centre for the day: what's happening now, what's next, vendor arrivals, balances due and coordinator notes." },
];

export default function LandingPage() {
  return (
    <div className="bg-surface text-ink">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5 md:px-6">
        <span className="font-display text-[28px] leading-[34px] font-medium">Wedding OS</span>
        <nav aria-label="Site" className="flex items-center gap-2">
          <Link href="#how" className="wos-btn wos-btn--ghost hidden sm:inline-flex">How it works</Link>
          <LandingCta variant="nav" />
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pt-10 pb-16 md:grid-cols-[1.2fr_1fr] md:px-6 md:pt-16 md:pb-24">
          <div className="flex flex-col gap-6">
            <span className="wos-overline">Made for Sri Lankan weddings</span>
            <h1 className="m-0 font-display text-[48px] leading-[52px] font-normal tracking-[-0.01em] md:text-[64px] md:leading-[68px]">
              Your Wedding,<br />Beautifully Planned.
            </h1>
            <p className="m-0 max-w-[520px] text-[18px] leading-[28px] text-ink-muted">Plan every detail, control every rupee, and enjoy the journey.</p>
            <div className="flex flex-wrap gap-3">
              <LandingCta variant="hero" />
              <Link href="#journey" className="wos-btn wos-btn--secondary wos-btn--lg">Explore Wedding Journey</Link>
            </div>
          </div>
          <div className="wos-hero wos-reveal" aria-hidden="true">
            <div className="wos-hero__main !flex-[1_1_100%]">
              <LotusMark className="wos-hero__lotus" />
              <span className="wos-overline">Nethmi &amp; Kasun</span>
              <div className="flex items-end gap-3">
                <span className="font-display text-[96px] leading-[84px] font-light">247</span>
                <span className="pb-1 font-display text-[28px] leading-[32px]">days to go</span>
              </div>
              <p className="m-0 text-[15px] opacity-85">Saturday, 12 June 2027 · Lotus Hall, Kandy</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-[13px] font-semibold">
                {[["Readiness", 58], ["Budget committed", 67], ["Guests replied", 84], ["Vendors booked", 44]].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1">
                    <span className="flex justify-between"><span>{k}</span><span>{v}%</span></span>
                    <div className="wos-hero__bar"><i style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface-raised" aria-labelledby="why">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
            <div className="flex flex-col gap-4">
              <span className="wos-overline">Why this exists</span>
              <h2 id="why" className="wos-h1">Plan it like an experience. Manage it like an investment.</h2>
            </div>
            <div className="flex flex-col gap-4 text-[16px] leading-[26px] text-ink-muted">
              <p className="m-0">Most weddings run on paper checklists, Excel sheets, WhatsApp threads and a lot of mental arithmetic. Quotes get lost, guest counts drift, and the budget is only clear once it&apos;s spent.</p>
              <p className="m-0">Wedding OS brings it into one calm place, so you always know what needs doing, where the money is going, and what happens next. Never a cheap wedding: an intentional one.</p>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24" aria-labelledby="how-title">
          <span className="wos-overline">How it works</span>
          <h2 id="how-title" className="wos-h1 mt-2 mb-10">Three steps to a plan you can trust.</h2>
          <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
            {[
              ["Tell us about your wedding", "Names, date, venue, guests, budget, and what matters most. Five short steps."],
              ["Get a dated plan instantly", "Around 90 tasks from the A–Z checklist, a starter budget and a draft wedding-day timeline, all calculated from your date."],
              ["Make it yours", "Add guests and vendors, compare quotes, record payments. Readiness and guidance update as you go."],
            ].map(([t, b], i) => (
              <li key={t} className="wos-card flex flex-col gap-3">
                <span className="font-display text-[40px] leading-[40px] text-champagne-700">0{i + 1}</span>
                <h3 className="m-0 text-[18px] leading-[26px] font-semibold">{t}</h3>
                <p className="m-0 text-ink-muted">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="journey" className="bg-surface-raised border-y border-line" aria-labelledby="journey-title">
          <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
            <span className="wos-overline">Wedding journey</span>
            <h2 id="journey-title" className="wos-h1 mt-2 mb-4">Twelve stages, from first idea to the album.</h2>
            <p className="m-0 mb-10 max-w-[640px] text-[16px] leading-[26px] text-ink-muted">Each stage moves from not started, to in progress, to complete as your tasks are done. You always know where you are.</p>
            <ol className="wos-journey m-0 list-none p-0 py-2">
              {JOURNEY.map((s, i) => (
                <li key={s} className={`wos-stage ${i < 3 ? "wos-stage--done" : i === 3 ? "wos-stage--active" : ""}`}>
                  <span className="wos-stage__dot">{i < 3 ? <Check className="wos-icon" aria-label="Completed" /> : String(i + 1).padStart(2, "0")}</span>
                  <span className="wos-stage__name">{s}</span>
                  <span className="wos-stage__state">{i < 3 ? "Completed" : i === 3 ? "In progress" : "Not started"}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24" aria-labelledby="features">
          <span className="wos-overline">Everything in one place</span>
          <h2 id="features" className="wos-h1 mt-2 mb-10">Built for the decisions that matter.</h2>
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {FEATURES.map((f) => (
              <article key={f.title} className="wos-card flex flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-[10px] bg-champagne-100 text-champagne-700"><f.icon className="wos-icon" aria-hidden="true" /></span>
                <h3 className="m-0 text-[18px] leading-[26px] font-semibold">{f.title}</h3>
                <p className="m-0 text-ink-muted">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-surface-raised" aria-labelledby="sl">
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-16 md:grid-cols-[1fr_1.2fr] md:px-6 md:py-24">
            <div className="flex gap-8 text-champagne-700" aria-hidden="true">
              <PoruwaMark className="size-24" />
              <LotusMark className="size-24" />
              <JasmineMark className="size-24" />
            </div>
            <div className="flex flex-col gap-4">
              <span className="wos-overline">Made for Sri Lankan weddings</span>
              <h2 id="sl" className="wos-h1">The Poruwa, the nekath, the going-away.</h2>
              <p className="m-0 text-[16px] leading-[26px] text-ink-muted">The checklist knows the Poruwa ceremony items, the Jayamangala Gatha, the registrar, the National Suit fitting, the Kandyan drummers and the going-away nekath. Budgets are in LKR, written the way you&apos;d say them.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24" aria-labelledby="sim">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Sparkles className="wos-icon size-8 text-champagne-700" aria-hidden="true" />
              <h2 id="sim" className="wos-h1">Experience your wedding before the day.</h2>
              <p className="m-0 text-[16px] leading-[26px] text-ink-muted">The Wedding Simulator walks you through your planned day, scene by scene: from the venue opening to the Poruwa to the going-away, with who is where and when.</p>
            </div>
            <div className="flex flex-col gap-4">
              <span className="wos-overline">What&apos;s next</span>
              <h3 className="wos-h2">From a couple&apos;s tool to a platform.</h3>
              <ul className="m-0 flex flex-col gap-2 pl-5 text-ink-muted">
                <li>Shared planning with family, with roles</li>
                <li>Public wedding page and online RSVP</li>
                <li>Planner and vendor workspaces</li>
                <li>WhatsApp reminders and an assistant that answers from your own plan</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 md:px-6">
          <div className="wos-hero mx-auto max-w-[1200px] flex-col items-center gap-5 px-6 py-16 text-center">
            <h2 className="m-0 font-display text-[40px] leading-[44px] font-normal md:text-[48px] md:leading-[54px]">Spend intentionally. Enjoy the journey.</h2>
            <LandingCta variant="footer" />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-4 py-6 text-[13px] text-ink-muted md:px-6">
          <span>Wedding OS</span>
          <span>Plan the wedding like a beautiful experience, manage it like an investment.</span>
        </div>
      </footer>
    </div>
  );
}
