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
    title: "Digital invitation — EverAfter Studio",
    why: "Guest open කළාම wax seal එක කැඩිලා, envelope එක 3D විදිහට ඇරිලා card එක එළියට එනවා — music, countdown, RSVP එක්ක.",
    how: [
      "\u201cInvitations\u201d → \u201cNew invitation\u201d → design එකක් තෝරන්න — අලුත් \u201cCrystal Garden Gate\u201d එකේ ribbon එක ලිහිලා දොරවල් ඇරෙනවා, ඊට පස්සේ golden light එකක් එක්ක wedding rings දෙක උඩට එනවා (ඔයාලගේ wedding colours වලින්).",
      "Guest ට tap button එක ළඟින් English / සිංහල තෝරන්න පුළුවන්. සිංහල වචන \u201cWording\u201d tab එකේ \u201cසිංහල\u201d කොටසේ ලියන්න (\u201cSuggest Sinhala wording\u201d බොත්තමත් තියෙනවා).",
      "\u201cSend to guests\u201d එකේ හැම guest කෙනෙක්ටම \u201cYou\u201d, \u201cYou Both\u201d හෝ \u201cYou & Your Family\u201d තෝරන්න පුළුවන්.",
      "Editor එකේ නම්, දවස, venue, Sinhala/English wording, photo, පාට, envelope, seal වෙනස් කරන්න. දකුණු පැත්තේ live preview එක.",
      "\u201cPublish\u201d → link එක, QR code එක, WhatsApp බොත්තම.",
      "\u201cRSVPs\u201d tab එකේ කවුද එනවා, කී දෙනාද, wishes බලන්න.",
      "Guest කෙනෙකුට තමන්ගේම link එක යවන්න \u201cSend to guests\u201d tab එක.",
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
const LANG_KEY = "wos-guide-lang";

type Lang = "en" | "si";

/** English text for each step (the default). */
const EN: Record<string, Pick<Step, "when" | "title" | "why" | "how" | "go">> = {
  colours: { when: "Now", title: "Choose your colours (Ivory + Champagne + Dusty pink)", why: "Cards, digital invitations and the table plan all follow these colours.", go: "Our look",
    how: ["Open \u201cOur look\u201d in the menu.", "Pick the \u201cIvory, champagne & dusty pink\u201d colour set.", "Optionally turn on \u201cUse our colours across the app\u201d.", "You can also take colours from a venue photo."] },
  hotel: { when: "Now", title: "Tell the app what the hotel provides", why: "Anything the hotel covers doesn't need a separate vendor — its booking tasks are ticked off for you.", go: "Vendors",
    how: ["Go to \u201cVendors\u201d → \u201cHotel Package\u201d.", "Catering: \u201cPlate price\u201d (the buffet is in the LKR 11,000 plate).", "Lighting: \u201cHotel, extra charge\u201d → 120,000.", "Decoration: \u201cHotel, extra charge\u201d + tick \u201cPrice not confirmed yet\u201d and slide to your estimate (175k – 1.5M). Update it when the hotel confirms in December.", "Press \u201cSave Package\u201d."] },
  budget: { when: "Now", title: "Budget — personal costs on their own lines", why: "Things like the earphone repair and salon treatments don't get mixed up with vendor bills.", go: "Budget",
    how: ["\u201cBudget\u201d → \u201cCategories\u201d.", "Under \u201cQuick add\u201d, tap \u201cEarphone repair (hearing backup)\u201d or \u201cSalon treatments before the wedding\u201d.", "Set the planned amount with the slider or type it → \u201cAdd Line\u201d.", "Prefer a spreadsheet? Use the \u201cSpreadsheet\u201d tab."] },
  payments: { when: "When you pay an advance", title: "Payments — who paid and what's left", why: "See what's paid, what's left and the next payment for every bill at a glance.", go: "Payments",
    how: ["\u201cBudget\u201d → \u201cPayments\u201d.", "On a bill, press \u201cPay advance\u201d (or \u201cAdd payment\u201d).", "Slide the amount (10% / 25% / 50% / Full balance) and choose \u201cWho paid?\u201d.", "Not paid yet? Choose \u201cPay later (reminder)\u201d and set the date.", "Paid an advance before adding its category? Use \u201cAssign\u201d under \u201cPayments not in a category yet\u201d."] },
  guests: { when: "8–6 months before", title: "Guest list with categories", why: "See and filter groups like the brand team or the photography crew.", go: "Guests",
    how: ["\u201cGuests\u201d → \u201cAdd\u201d.", "Side: Bride / Groom / \u201cBoth of us\u201d (for crew and brand team).", "Category: tap \u201cBrand team\u201d, \u201cPhotography crew\u201d… or type your own.", "Adding many at once? Use Excel (step 11)."] },
  menu: { when: "6–3 months before", title: "Menu — mutton, delete dishes, mark final", why: "Choose course by course and send it straight to the hotel.", go: "Menu",
    how: ["\u201cMenu\u201d → \u201cParadise Inn — Crystal Glow\u201d.", "Mutton replaces the pork course (older menus: \u201cSwap to Mutton\u201d).", "Don't want a dish? \u201cAdd / Delete Dishes\u201d → 🗑.", "When every course is chosen: \u201cMark Menu Final\u201d → \u201cShare on WhatsApp\u201d."] },
  tables: { when: "2–1 months before", title: "Venue designer — tables, outdoor Poruwa, 3D", why: "Lay out the hall as it really is and see who sits where.", go: "Tables",
    how: ["\u201cTables\u201d → tick \u201cPoruwa and bar outdoors\u201d → \u201cCreate Layout\u201d.", "Tap anything to select it, then drag. The round handle turns it; the square handle resizes it.", "\u201cManage tables\u201d: delete a table, add several at once, or renumber them.", "Drag a guest from the list onto a table — or press \u201cSeat Everyone\u201d.", "\u201c3D view\u201d → \u201cFrom the entrance\u201d / \u201cFrom the Poruwa\u201d to walk around."] },
  report: { when: "1 month before", title: "Share the guest report", why: "A beautiful list with table numbers — for family, the hotel and the entrance.", go: "Guest report",
    how: ["\u201cGuests\u201d → \u201cShare Report\u201d.", "Choose \u201cBy table\u201d or \u201cA–Z · find your table\u201d.", "\u201cPrint / PDF\u201d, \u201cExcel\u201d or \u201cWhatsApp\u201d."] },
  cards: { when: "4–3 months before", title: "Wedding card, envelope, cake box (+ Canva)", why: "Print at real size — or finish the design in Canva.", go: "Cards",
    how: ["\u201cCards & boxes\u201d → pick a design (Ivory & blush / Arch with our photo / Ribbon & wax seal).", "For the arch design, \u201cAdd our photo\u201d.", "Names: \u201cCalligraphy\u201d or \u201cClassic\u201d.", "Download the \u201cSVG\u201d and upload it in Canva Pro (steps under \u201cFinish it in Canva Pro\u201d)."] },
  invite: { when: "3–2 months before", title: "Digital invitation — EverAfter Studio", why: "Guests break the wax seal, the envelope opens in 3D and the card rises out — with music, a countdown and RSVP.", go: "Invitations",
    how: ["\u201cInvitations\u201d → \u201cNew invitation\u201d → choose a design. The new \u201cCrystal Garden Gate\u201d unties a silk ribbon, opens carved garden doors onto a floral arch, then two gold rings rise in golden light — in your wedding colours.", "Add \u201cOur story\u201d chapters under Wording; they appear on the garden-gate invitation.", "Guests can switch between English and සිංහල next to the tap button. Write the Sinhala wording in the \u201cසිංහල\u201d part of the Wording tab, or press \u201cSuggest Sinhala wording\u201d.", "In \u201cSend to guests\u201d, choose \u201cYou\u201d, \u201cYou Both\u201d or \u201cYou & Your Family\u201d for each guest.", "In the editor, change names, date, venue, Sinhala/English wording, photo, colours, envelope and seal. The live preview is on the right.", "\u201cPublish\u201d → your link, QR code and WhatsApp button.", "The \u201cRSVPs\u201d tab shows who's coming, how many, and their wishes.", "To send each guest their own link, use the \u201cSend to guests\u201d tab."] },
  excel: { when: "Any time", title: "Excel — export and import everything", why: "Edit comfortably in Excel and bring it back. Also a handy backup.", go: "Reports",
    how: ["\u201cReports\u201d → \u201cExport Everything\u201d.", "Edit in Excel or Google Sheets. Don't change the ID column; leave ID empty for new rows.", "To delete a row, write Yes in \u201cDelete?\u201d. (Removing a row does not delete it — your data is safe.)", "\u201cImport from Excel\u201d → check the changes → \u201cApply Changes\u201d."] },
  activity: { when: "Every day", title: "Activity — what each of you changed", why: "Who changed what. Refreshes every 30 seconds, and there's a \u201cRefresh\u201d button.", go: "Activity",
    how: ["Open \u201cActivity\u201d (also on Home under \u201cRecent activity\u201d).", "Nothing showing? Make sure the database updates (migrations) were run in the Supabase SQL Editor."] },
};

export function GuideView() {
  const [done, setDone] = useState<string[]>([]);
  const [lang, setLangState] = useState<Lang>("en");
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // ignore
    }
  };
  const [zoom, setZoom] = useState<Step["shots"][number] | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
      if (Array.isArray(saved) && saved.length) setTimeout(() => setDone(saved), 0);
      if (localStorage.getItem(LANG_KEY) === "si") setTimeout(() => setLangState("si"), 0);
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
      <PageHeader overline="Start here" title={lang === "en" ? "User guide · step by step" : "User guide · පියවරෙන් පියවර"}
        lead={lang === "en" ? "Not sure what to do first? Follow this order. Every step has a screenshot. Tick the ones you've finished 🎉" : "මොකක්ද මුලින්ම කරන්න ඕනි කියලා පටලැවෙනවා නම් — මේ පිළිවෙළට යන්න. හැම step එකකටම screenshot එකක් තියෙනවා. ඉවර කරපු ඒවා tick කරන්න 🎉"}
        actions={
          <div className="wos-tabs" role="radiogroup" aria-label="Language">
            <button type="button" role="radio" className="wos-tab" aria-checked={lang === "en"} onClick={() => setLang("en")}>English</button>
            <button type="button" role="radio" className="wos-tab" aria-checked={lang === "si"} onClick={() => setLang("si")} lang="si">සිංහල</button>
          </div>
        } />
      <section className="guide-progress" aria-label="Progress">
        <div className="flex items-baseline justify-between gap-3">
          <b>{done.length} / {STEPS.length} {lang === "en" ? "done" : "ඉවරයි"}</b>
          <span className="text-[13px] text-ink-muted">{lang === "en" ? (pct === 100 ? "Wonderful — everything is set up! 💍" : "Your ticks are remembered on this phone or computer.") : (pct === 100 ? "නියමයි! සේරම setup කරලා 💍" : "Tick කරන එක ඔයාගේ phone/computer එකේ මතක තියාගන්නවා.")}</span>
        </div>
        <div className="bill-bar"><i style={{ width: `${pct}%` }} /></div>
      </section>

      <ol className="guide-steps">
        {STEPS.map((step, i) => {
          const s = lang === "en" ? { ...step, ...EN[step.id] } : step;
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
                <ol className="guide-how" lang={lang === "si" ? "si" : undefined}>
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
                <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={(e) => toggle(s.id, e.currentTarget)}>{isDone ? (lang === "en" ? "Undo" : "ආපසු") : lang === "en" ? "Done ✓" : "ඉවරයි ✓"}</button>
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
