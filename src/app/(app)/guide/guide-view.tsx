"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { PageHeader, cx } from "@/components/ui/primitives";
import { celebrate } from "@/lib/confetti";

/**
 * "Where do I start?" — the app in the order a couple actually plans, in
 * Sinhala, with a screenshot for every step and a tick to track progress.
 */

interface Step {
  id: string;
  when: string;
  title: string;
  why: string;
  how: string[];
  href: string;
  go: string;
  shots: { src: string; alt: string; phone?: boolean }[];
}

const STEPS: Step[] = [
  {
    id: "colours",
    when: "දැන්ම",
    title: "අපේ පාට තෝරන්න (Ivory + Champagne + Dusty pink)",
    why: "කාඩ්, Digital invitation, මේස සැලැස්ම — හැම එකම මේ පාටින් හැදෙනවා.",
    how: [
      "වම් පැත්තේ menu එකේ “Our look” ඔබන්න.",
      "“Ivory, champagne & dusty pink” පාට set එක තෝරන්න.",
      "කැමති නම් “Use our colours across the app” දාලා app එකම ඒ පාටට හරවන්න.",
      "Venue photo එකක් දැම්මොත් ඒකෙන් පාට ගන්නත් පුළුවන්.",
    ],
    href: "/design",
    go: "Our look",
    shots: [{ src: "/guide/02-colours.jpg", alt: "Wedding colours" }],
  },
  {
    id: "hotel",
    when: "දැන්ම",
    title: "Hotel එකෙන් ලැබෙන දේවල් දාන්න",
    why: "Hotel එක කරන දේවල් වලට වෙනම vendor හොයන්න ඕනි නැහැ — app එක ඒ tasks auto tick කරනවා.",
    how: [
      "“Vendors” → “Hotel Package” ඔබන්න.",
      "Catering: “Plate price” (Buffet එක plate 11,000 ට ඇතුළත්).",
      "Lighting: “Hotel, extra charge” → 120,000.",
      "Decoration: “Hotel, extra charge” + “Price not confirmed yet” tick කරලා slider එකෙන් අනුමාන ගාණ දාන්න (175k – 1.5M). December වල ගාණ ආවම update කරන්න.",
      "“Save Package”.",
    ],
    href: "/vendors",
    go: "Vendors",
    shots: [{ src: "/guide/03-hotel.jpg", alt: "Hotel package" }],
  },
  {
    id: "budget",
    when: "දැන්ම",
    title: "Budget එක — පෞද්ගලික වියදම් වෙනම",
    why: "Earphone එක හදන එක, salon treatments වගේ දේවල් vendor bills එක්ක පටලැවෙන්නේ නැහැ.",
    how: [
      "“Budget” → “Categories”.",
      "“Quick add” එකේ “Earphone repair (hearing backup)”, “Salon treatments before the wedding” ඔබන්න.",
      "Planned ගාණ slider එකෙන් හරි type කරලා හරි දාන්න → “Add Line”.",
      "ලොකු table එකක් වගේ edit කරන්න ඕනි නම් “Spreadsheet” tab එක.",
    ],
    href: "/budget?tab=categories",
    go: "Budget",
    shots: [{ src: "/guide/04-budget-quick.jpg", alt: "Quick add personal costs" }],
  },
  {
    id: "payments",
    when: "Advance ගෙවනකොට",
    title: "Advance / payments — කවුද ගෙව්වේ, තව කීයද",
    why: "එක එක bill එකට ගෙවපු ගාණ, ඉතුරු ගාණ, ඊළඟ ගෙවීම එක බැල්මෙන්.",
    how: [
      "“Budget” → “Payments”.",
      "Bill එකේ “Pay advance” (හෝ “Add payment”) ඔබන්න.",
      "Slider එකෙන් ගාණ (10% / 25% / 50% / Full balance) → “Who paid?” (ඔයා / bride / පවුල) තෝරන්න.",
      "දැන් ගෙව්වේ නැත්නම් “Pay later (reminder)” — දවස දාන්න.",
      "උඩ “Who paid” එකේ කවුද කීයක් ගෙව්වාද කියලා පේනවා.",
    ],
    href: "/budget?tab=payments",
    go: "Payments",
    shots: [{ src: "/guide/05-payments.jpg", alt: "Every bill" }, { src: "/guide/06-pay-dialog.jpg", alt: "Pay an advance" }],
  },
  {
    id: "guests",
    when: "මාස 8–6 කලින්",
    title: "Guest list — Category එක්ක",
    why: "Brand team, Photography crew වගේ අයව වෙනම බලන්න, filter කරන්න පුළුවන්.",
    how: [
      "“Guests” → “Add”.",
      "Side: Bride / Groom / “Both of us” (crew, brand team වලට).",
      "Category: “Brand team”, “Photography crew”… ඔබන්න හරි type කරන්න.",
      "ගොඩක් අය එකපාර දාන්න Excel එකෙන් (පහළ step 10 බලන්න).",
    ],
    href: "/guests?new=1",
    go: "Guests",
    shots: [{ src: "/guide/07-guest-form.jpg", alt: "Guest with a category" }],
  },
  {
    id: "menu",
    when: "මාස 6–3 කලින්",
    title: "Menu එක — Mutton, delete, final",
    why: "Course එකෙන් course එක තෝරලා hotel එකට කෙලින්ම යවන්න.",
    how: [
      "“Menu” → “Paradise Inn — Crystal Glow”.",
      "Pork වෙනුවට mutton: Mutton course එක දැනටමත් තියෙනවා (පරණ menu එකක් නම් “Swap to Mutton”).",
      "ඕනි නැති dish: “Add / Delete Dishes” → 🗑.",
      "හැම course එකම තෝරලා “Mark Menu Final” → “Share on WhatsApp”.",
    ],
    href: "/menu",
    go: "Menu",
    shots: [{ src: "/guide/08-menu.jpg", alt: "Menu" }],
  },
  {
    id: "tables",
    when: "මාස 2–1 කලින්",
    title: "Venue designer — මේස, Poruwa එළියේ, 3D",
    why: "ශාලාව ඇත්තටම පේන විදිහට සකස් කරලා, කවුද කොහෙද ඉන්නේ කියලා බලන්න.",
    how: [
      "“Tables” → “Poruwa and bar outdoors” tick කරලා “Create Layout”.",
      "ඕනම දෙයක් ඔබලා drag කරන්න. රවුම් handle එකෙන් කරකවන්න, කොටු handle එකෙන් size කරන්න.",
      "“Hall size & outdoor area” එකෙන් ශාලාවේ දිග පළල.",
      "Guest කෙනෙක්ව list එකෙන් මේසයක් උඩට drag කරන්න — නැත්නම් “Seat Everyone”.",
      "“3D view” → “From the entrance” / “From the Poruwa” — ඇතුළේ ඇවිදිනවා වගේ බලන්න.",
    ],
    href: "/tables",
    go: "Tables",
    shots: [{ src: "/guide/09-tables.jpg", alt: "Floor plan" }, { src: "/guide/10-3d.jpg", alt: "3D view" }],
  },
  {
    id: "report",
    when: "මාස 1 කලින්",
    title: "Guest report එක share කරන්න",
    why: "මේස අංක එක්ක ලස්සන list එකක් — පවුලේ අයට, hotel එකට, entrance එකට.",
    how: [
      "“Guests” → “Share Report”.",
      "“By table” හරි “A–Z · find your table” හරි.",
      "“Print / PDF”, “Excel”, “WhatsApp”.",
    ],
    href: "/guests/report",
    go: "Guest report",
    shots: [{ src: "/guide/11-report.jpg", alt: "Guest report" }],
  },
  {
    id: "cards",
    when: "මාස 4–3 කලින්",
    title: "Wedding card, envelope, cake box (+ Canva)",
    why: "ඇත්ත size එකට print කරන්න පුළුවන් — නැත්නම් Canva එකේ තවත් ලස්සන කරන්න.",
    how: [
      "“Cards & boxes” → design එකක් (Ivory & blush / Arch with our photo / Ribbon & wax seal).",
      "Arch design එකට “Add our photo”.",
      "Names: “Calligraphy” හරි “Classic” හරි.",
      "“SVG” download කරලා Canva Pro → Uploads → design එකට දාන්න (පියවර “Finish it in Canva Pro” එකේ).",
    ],
    href: "/cards",
    go: "Cards",
    shots: [{ src: "/guide/12-cards.jpg", alt: "Cards" }],
  },
  {
    id: "invite",
    when: "මාස 3–2 කලින්",
    title: "Digital invitation — music, petals, countdown",
    why: "හැම guest කෙනෙක්ටම තමන්ගේම link එකක්. Open කළාම envelope එක ඇරෙනවා, සින්දුවක් එක්ක. Reply කළොත් list එක auto update වෙනවා.",
    how: [
      "“Invitations” → පාට, music (Music box / Soft piano), effects තෝරන්න. Phone එකේ preview එක බලන්න.",
      "Step 2: “Online RSVP” on කරන්න (cloud account ඕනි).",
      "Step 3: “Send to next guest” — WhatsApp එක message එක්කම open වෙනවා. Send කළාම ඊළඟ කෙනා.",
      "“Opened”, “Attending” කියලා කවුද බැලුවේ/කිව්වේ කියලා පේනවා.",
    ],
    href: "/invitations",
    go: "Invitations",
    shots: [{ src: "/guide/13-invitations.jpg", alt: "Invitations page" }, { src: "/guide/14-invite-sealed.jpg", alt: "Sealed envelope", phone: true }, { src: "/guide/15-invite-open.jpg", alt: "Opened invitation", phone: true }],
  },
  {
    id: "excel",
    when: "ඕනම වෙලාවක",
    title: "Excel — සේරම export / import",
    why: "Excel එකේ ලේසියෙන් edit කරලා ආපහු දාන්න. Backup එකක් විදිහටත්.",
    how: [
      "“Reports” → “Export Everything”.",
      "Excel / Google Sheets එකේ edit කරන්න. ID column එක වෙනස් කරන්න එපා. අලුත් row එකක ID එක හිස්ව තියන්න.",
      "Delete කරන්න ඕනි row එකේ “Delete?” = Yes. (Row එකක් මැකුවට delete වෙන්නේ නැහැ — data ආරක්ෂිතයි.)",
      "“Import from Excel” → වෙනස්කම් බලලා “Apply Changes”.",
    ],
    href: "/reports",
    go: "Reports",
    shots: [{ src: "/guide/16-excel.jpg", alt: "Excel workbook" }],
  },
  {
    id: "activity",
    when: "හැමදාම",
    title: "Activity — bride/groom කරපු දේවල්",
    why: "කවුද මොනවද වෙනස් කළේ කියලා. තත්පර 30න් 30ට auto refresh වෙනවා; “Refresh” බොත්තමත් තියෙනවා.",
    how: [
      "“Activity” page එක (Home එකේ “Recent activity” එකෙත් පේනවා).",
      "Activity නොපෙන්නේ නම්: Supabase SQL Editor එකේ migrations ටික run කරලා තියෙනවද බලන්න.",
    ],
    href: "/activity",
    go: "Activity",
    shots: [{ src: "/guide/17-activity.jpg", alt: "Activity" }],
  },
];

const KEY = "wos-guide-done";

export function GuideView() {
  const [done, setDone] = useState<string[]>([]);
  const [zoom, setZoom] = useState<Step["shots"][number] | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
      if (Array.isArray(saved) && saved.length) setTimeout(() => setDone(saved), 0);
    } catch {
      // Private mode: ticks just won't be remembered.
    }
  }, []);

  const toggle = (id: string, el: HTMLElement) => {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    if (!done.includes(id)) celebrate(el, next.length === STEPS.length ? 80 : 24);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const pct = Math.round((done.length / STEPS.length) * 100);

  return (
    <>
      <PageHeader overline="Start here" title="User guide · පියවරෙන් පියවර" lead="මොකක්ද මුලින්ම කරන්න ඕනි කියලා පටලැවෙනවා නම් — මේ පිළිවෙළට යන්න. හැම step එකකටම screenshot එකක් තියෙනවා. ඉවර කරපු ඒවා tick කරන්න 🎉" />
      <section className="guide-progress" aria-label="Progress">
        <div className="flex items-baseline justify-between gap-3">
          <b>{done.length} / {STEPS.length} ඉවරයි</b>
          <span className="text-[13px] text-ink-muted">{pct === 100 ? "නියමයි! සේරම setup කරලා 💍" : "Tick කරන එක ඔයාගේ phone/computer එකේ මතක තියාගන්නවා."}</span>
        </div>
        <div className="bill-bar"><i style={{ width: `${pct}%` }} /></div>
      </section>

      <ol className="guide-steps">
        {STEPS.map((s, i) => {
          const isDone = done.includes(s.id);
          return (
            <li key={s.id} className={cx("guide-step wos-card", isDone && "is-done")}>
              <div className="guide-step-head">
                <button type="button" className="guide-num" aria-pressed={isDone} aria-label={isDone ? `Step ${i + 1} done — tap to undo` : `Mark step ${i + 1} done`} onClick={(e) => toggle(s.id, e.currentTarget)}>
                  {isDone ? <Check aria-hidden="true" /> : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <span className="guide-when">{s.when}</span>
                  <h2 className="guide-title">{s.title}</h2>
                  <p className="guide-why">{s.why}</p>
                </div>
              </div>
              <div className="guide-body">
                <ol className="guide-how">
                  {s.how.map((h, k) => <li key={k}>{h}</li>)}
                </ol>
                <div className={cx("guide-shots", s.shots.some((x) => x.phone) && "has-phone")}>
                  {s.shots.map((shot) => (
                    <button key={shot.src} type="button" className={cx("guide-shot", shot.phone && "is-phone")} onClick={() => setZoom(shot)} aria-label={`Enlarge screenshot: ${shot.alt}`}>
                      <Image src={shot.src} alt={shot.alt} width={shot.phone ? 585 : 1280} height={shot.phone ? 1170 : 820} sizes="(max-width: 768px) 100vw, 480px" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={s.href} className="wos-btn wos-btn--primary wos-btn--sm">{s.go}<ArrowRight className="wos-icon" aria-hidden="true" /></Link>
                <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={(e) => toggle(s.id, e.currentTarget)}>{isDone ? "Undo" : "ඉවරයි ✓"}</button>
              </div>
            </li>
          );
        })}
      </ol>

      {zoom && (
        <div className="guide-zoom" role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}>
          <Image src={zoom.src} alt={zoom.alt} width={zoom.phone ? 585 : 1280} height={zoom.phone ? 1170 : 820} sizes="95vw" />
          <button type="button" className="inv-full-close" aria-label="Close"><X aria-hidden="true" /></button>
        </div>
      )}
    </>
  );
}
