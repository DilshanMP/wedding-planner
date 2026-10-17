import type { ReactNode } from "react";
import { formatDate, formatTime } from "@/lib/domain/dates";
import { FONTS, type InviteContent, type InviteDesign } from "@/lib/domain/invite-studio";
import { mix } from "@/lib/theme-colors";
import {
  Border, CARD_H, CARD_W, CardDefs, Crest, Divider, FloralCluster, LotusFlower, OilLamp, Sunburst, Wreath, shapePath, useCardIds,
} from "./card-art";

/**
 * The invitation card, drawn in SVG at real size (5 × 7 in, units of
 * 0.1 mm). The same drawing slides out of the envelope, fills the guest's
 * screen and is exported to PNG, SVG, PDF and Canva.
 */

const SINHALA = /[඀-෿]/;
const W = CARD_W;
const H = CARD_H;
const CX = W / 2;

/** Rough characters-per-line for wrapping in SVG (no text measuring there). */
function wrap(text: string, width: number, size: number, kind: "serif" | "script" | "sans"): string[] {
  const factor = SINHALA.test(text) ? 0.62 : kind === "script" ? 0.42 : kind === "sans" ? 0.55 : 0.48;
  const max = Math.max(8, Math.floor(width / (size * factor)));
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const word of para.trim().split(/\s+/).filter(Boolean)) {
      if ((line + " " + word).trim().length > max && line) {
        out.push(line);
        line = word;
      } else line = (line + " " + word).trim();
    }
    if (line) out.push(line);
  }
  return out;
}

function clamp(lines: string[], n: number): string[] {
  if (lines.length <= n) return lines;
  const kept = lines.slice(0, n);
  kept[n - 1] = `${kept[n - 1].replace(/[.,;:!?]?$/, "")}…`;
  return kept;
}

type Item =
  | { k: "text"; lines: string[]; size: number; family: string; fill: string; weight?: number; italic?: boolean; spacing?: number; upper?: boolean; lh?: number }
  | { k: "space"; h: number }
  | { k: "node"; h: number; render: (top: number) => ReactNode };

/** Stack items top-down; returns the drawing and its height. */
function flow(items: Item[], x: number, anchor: "middle" | "start" = "middle"): { nodes: ReactNode[]; height: number } {
  let y = 0;
  const nodes: ReactNode[] = [];
  items.forEach((it, i) => {
    if (it.k === "space") {
      y += it.h;
      return;
    }
    if (it.k === "node") {
      nodes.push(<g key={i}>{it.render(y)}</g>);
      y += it.h;
      return;
    }
    if (!it.lines.length) return;
    const lh = it.size * (it.lh ?? 1.28);
    nodes.push(
      <text key={i} x={x} y={y + it.size * 0.86} textAnchor={anchor} fontSize={it.size} fontFamily={it.family} fill={it.fill} fontWeight={it.weight ?? 400}
        fontStyle={it.italic ? "italic" : undefined} letterSpacing={it.spacing}>
        {it.lines.map((l, k) => <tspan key={k} x={x} dy={k === 0 ? 0 : lh}>{it.upper ? l.toUpperCase() : l}</tspan>)}
      </text>,
    );
    y += it.size + lh * (it.lines.length - 1) + it.size * 0.25;
  });
  return { nodes, height: y };
}

/** Place a flow between `top` and `bottom`, shrinking it if it doesn't fit. */
function Fit({ items, top, bottom, x = CX, anchor = "middle" }: { items: Item[]; top: number; bottom: number; x?: number; anchor?: "middle" | "start" }) {
  const { nodes, height } = flow(items, x, anchor);
  const room = bottom - top;
  const s = height > room ? room / height : 1;
  const dy = height < room ? (room - height) / 2 : 0;
  return <g transform={`translate(${x} ${top + dy}) scale(${s.toFixed(4)}) translate(${-x} 0)`}>{nodes}</g>;
}

interface Ctx {
  c: InviteDesign["colors"];
  d: InviteDesign;
  t: InviteContent;
  ids: ReturnType<typeof useCardIds>;
  names: string;
  head: string;
  body: string;
  nameKind: "serif" | "script" | "sans";
  bodyKind: "serif" | "script" | "sans";
  sn: number;
  sb: number;
  hasPhoto: boolean;
}

function dateParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return {
    weekday: dt.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }),
    day: String(d || ""),
    month: dt.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }),
    year: String(y || ""),
    long: iso ? formatDate(iso) : "",
  };
}

const sinhalaFamily = "'Noto Serif Sinhala', 'Iskoola Pota', serif";

/** Shared text pieces. */
function pieces(x: Ctx) {
  const { t, c } = x;
  const hosts = [t.brideParents, t.groomParents].filter(Boolean).join("  &  ");
  const full = t.brideFull || t.groomFull ? `${t.brideFull || t.brideName} & ${t.groomFull || t.groomName}` : "";
  const time = t.ceremonyTime || t.time;
  const when = `${time ? formatTime(time).replace(":00", "") : ""}`;
  const where = [t.venueName, t.address].filter(Boolean);
  const rsvp = t.rsvpDeadline ? `Kindly reply by ${formatDate(t.rsvpDeadline)}` : "";
  const msg = (lines: number, width: number, size: number) => clamp(wrap(t.inviteMessage, width, size, x.bodyKind), lines);
  const name = (n: string, size: number): Item => ({ k: "text", lines: [n || " "], size: size * x.sn, family: x.names, fill: c.ink, italic: x.nameKind === "serif" });
  return { hosts, full, when, where, rsvp, msg, name };
}

/** The couple's photo, cropped to a shape, with the editor's position and zoom. */
function Photo({ ctx, box, shape }: { ctx: Ctx; box: { x: number; y: number; w: number; h: number }; shape: "circle" | "rect" | "arch" | "oval" }) {
  const p = ctx.d.photo;
  if (!p.src) return null;
  const iw = box.w * p.zoom;
  const ih = box.h * p.zoom;
  const ix = box.x - (iw - box.w) * (p.x / 100);
  const iy = box.y - (ih - box.h) * (p.y / 100);
  const id = ctx.ids.photo;
  const clip = shape === "circle" ? <circle cx={box.x + box.w / 2} cy={box.y + box.h / 2} r={Math.min(box.w, box.h) / 2} />
    : shape === "oval" ? <ellipse cx={box.x + box.w / 2} cy={box.y + box.h / 2} rx={box.w / 2} ry={box.h / 2} />
      : shape === "arch" ? <path d={`M${box.x} ${box.y + box.w / 2}A${box.w / 2} ${box.w / 2} 0 0 1 ${box.x + box.w} ${box.y + box.w / 2}V${box.y + box.h}H${box.x}Z`} />
        : <rect x={box.x} y={box.y} width={box.w} height={box.h} />;
  return (
    <g>
      <clipPath id={id}>{clip}</clipPath>
      <image href={p.src} x={ix} y={iy} width={iw} height={ih} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`}
        style={ctx.d.card.layout === "blacktie" ? { filter: "grayscale(0.9) contrast(1.05)" } : undefined} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Layouts                                                             */
/* ------------------------------------------------------------------ */

function Classic(x: Ctx) {
  const { c, t, ids } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  const top = x.hasPhoto ? 600 : 200;
  return (
    <>
      <FloralCluster kind={x.d.florals} x={20} y={20} s={1.15} c={c} />
      <FloralCluster kind={x.d.florals} x={W - 20} y={H - 20} s={0.95} c={c} flipX={-1} flipY={-1} />
      {x.hasPhoto && (
        <g>
          <circle cx={CX} cy={360} r={196} fill="none" stroke={`url(#${ids.foil})`} strokeWidth="8" />
          <Photo ctx={x} box={{ x: CX - 182, y: 178, w: 364, h: 364 }} shape="circle" />
        </g>
      )}
      <Fit top={top} bottom={H - 170} items={[
        { k: "text", lines: [t.blessing], size: 30 * x.sb, family: x.head, fill: c.accent, spacing: 5, upper: true, weight: 500 },
        { k: "space", h: 14 },
        { k: "text", lines: t.sinhalaLine ? [t.sinhalaLine] : [], size: 46 * x.sb, family: sinhalaFamily, fill: c.ink, weight: 600 },
        { k: "space", h: 26 },
        { k: "text", lines: p.hosts ? wrap(p.hosts, 900, 34 * x.sb, x.bodyKind) : [], size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "text", lines: p.msg(x.hasPhoto ? 2 : 3, 940, 36 * x.sb), size: 36 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 34 },
        p.name(t.brideName, 140),
        { k: "text", lines: ["&"], size: 64, family: x.head, fill: c.accent, italic: true },
        p.name(t.groomName, 140),
        { k: "space", h: 18 },
        { k: "text", lines: p.full ? [p.full] : [], size: 28 * x.sb, family: x.head, fill: c.ink, spacing: 3, upper: true },
        { k: "space", h: 36 },
        { k: "node", h: 170, render: (y) => (
          <g>
            <line x1={CX - 400} x2={CX - 110} y1={y + 40} y2={y + 40} stroke={c.accent} strokeWidth="2" />
            <line x1={CX - 400} x2={CX - 110} y1={y + 118} y2={y + 118} stroke={c.accent} strokeWidth="2" />
            <line x1={CX + 110} x2={CX + 400} y1={y + 40} y2={y + 40} stroke={c.accent} strokeWidth="2" />
            <line x1={CX + 110} x2={CX + 400} y1={y + 118} y2={y + 118} stroke={c.accent} strokeWidth="2" />
            <text x={CX - 255} y={y + 92} textAnchor="middle" fontSize={34} fontFamily={x.head} fill={c.ink} letterSpacing="5">{dp.weekday.toUpperCase()}</text>
            <text x={CX} y={y + 128} textAnchor="middle" fontSize={130} fontFamily={x.head} fill={`url(#${ids.foil})`}>{dp.day}</text>
            <text x={CX + 255} y={y + 92} textAnchor="middle" fontSize={34} fontFamily={x.head} fill={c.ink} letterSpacing="5">{`${dp.month} ${dp.year}`.toUpperCase()}</text>
          </g>
        ) },
        { k: "text", lines: p.when ? [`at ${p.when}`] : [], size: 36 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 10 },
        { k: "text", lines: p.where.slice(0, 1), size: 40 * x.sb, family: x.head, fill: c.ink, weight: 500 },
        { k: "text", lines: p.where.slice(1), size: 30 * x.sb, family: x.body, fill: c.ink },
      ]} />
      {p.rsvp && <text x={CX} y={H - 120} textAnchor="middle" fontSize={26} fontFamily={x.head} fill={c.accent} letterSpacing="3">{p.rsvp.toUpperCase()}</text>}
    </>
  );
}

function Garden(x: Ctx) {
  const { c, t } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  return (
    <>
      <circle cx={CX} cy={430} r={330} fill={`url(#${x.ids.wash})`} />
      <Wreath cx={CX} cy={430} r={230} kind={x.d.florals === "none" ? "roses" : x.d.florals} c={c} />
      {x.hasPhoto ? (
        <Photo ctx={x} box={{ x: CX - 195, y: 235, w: 390, h: 390 }} shape="circle" />
      ) : (
        <text x={CX} y={480} textAnchor="middle" fontSize={130} fontFamily={x.names} fill={c.ink}>{x.d.seal.text.replace(/\s/g, "")}</text>
      )}
      <FloralCluster kind={x.d.florals} x={W - 20} y={H - 20} s={0.8} c={c} flipX={-1} flipY={-1} />
      <FloralCluster kind={x.d.florals} x={20} y={H - 20} s={0.6} c={c} flipY={-1} />
      <Fit top={720} bottom={H - 150} items={[
        { k: "text", lines: t.sinhalaLine ? [t.sinhalaLine] : [], size: 42 * x.sb, family: sinhalaFamily, fill: c.ink, weight: 600 },
        { k: "space", h: 16 },
        { k: "text", lines: p.msg(3, 960, 36 * x.sb), size: 36 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 26 },
        p.name(`${t.brideName} & ${t.groomName}`, 118),
        { k: "space", h: 26 },
        { k: "text", lines: [`${dp.weekday}, ${dp.long}`], size: 38 * x.sb, family: x.head, fill: c.ink, weight: 600 },
        { k: "text", lines: p.when ? [p.when] : [], size: 34 * x.sb, family: x.body, fill: c.ink },
        { k: "space", h: 14 },
        { k: "text", lines: p.where, size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 18 },
        { k: "text", lines: p.rsvp ? [p.rsvp] : [], size: 26, family: x.head, fill: c.accent, spacing: 3, upper: true },
      ]} />
    </>
  );
}

function Editorial(x: Ctx) {
  const { c, t } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  const L = 130;
  const topY = x.hasPhoto ? 700 : 260;
  return (
    <>
      {x.hasPhoto && <Photo ctx={x} box={{ x: L, y: 130, w: W - 2 * L, h: 520 }} shape="rect" />}
      <text x={L} y={x.hasPhoto ? 690 : 210} fontSize={26} fontFamily={x.body} fill={c.accent} letterSpacing="10">THE WEDDING OF</text>
      <Fit x={L} anchor="start" top={topY} bottom={H - 470} items={[
        p.name(t.brideFull || t.brideName, 150),
        { k: "text", lines: ["&"], size: 90, family: x.names, fill: c.accent, italic: true },
        p.name(t.groomFull || t.groomName, 150),
        { k: "space", h: 40 },
        { k: "node", h: 30, render: (y) => <line x1={L} x2={L + 220} y1={y + 10} y2={y + 10} stroke={c.ink} strokeWidth="3" /> },
        { k: "text", lines: p.msg(4, 800, 34 * x.sb), size: 34 * x.sb, family: x.body, fill: c.ink, lh: 1.45 },
      ]} />
      <line x1={L} x2={W - L} y1={H - 430} y2={H - 430} stroke={c.ink} strokeWidth="1.5" />
      <text x={L} y={H - 370} fontSize={24} fontFamily={x.body} fill={c.accent} letterSpacing="8">WHEN</text>
      <text x={L} y={H - 310} fontSize={40 * x.sb} fontFamily={x.head} fill={c.ink} fontWeight={500}>{`${dp.day} ${dp.month}`}</text>
      <text x={L} y={H - 260} fontSize={34 * x.sb} fontFamily={x.body} fill={c.ink}>{`${dp.weekday} ${dp.year}`}</text>
      <text x={L} y={H - 210} fontSize={34 * x.sb} fontFamily={x.body} fill={c.ink}>{p.when}</text>
      <text x={CX + 40} y={H - 370} fontSize={24} fontFamily={x.body} fill={c.accent} letterSpacing="8">WHERE</text>
      {wrap(p.where.join(", "), 470, 34 * x.sb, x.bodyKind).slice(0, 4).map((l, i) => (
        <text key={i} x={CX + 40} y={H - 310 + i * 48} fontSize={(i === 0 ? 40 : 32) * x.sb} fontFamily={i === 0 ? x.head : x.body} fill={c.ink} fontWeight={i === 0 ? 500 : 400}>{l}</text>
      ))}
      {p.rsvp && <text x={L} y={H - 120} fontSize={24} fontFamily={x.body} fill={c.ink} letterSpacing="4">{p.rsvp.toUpperCase()}</text>}
      <text transform={`translate(${W - 70} ${H / 2}) rotate(90)`} textAnchor="middle" fontSize={22} fontFamily={x.body} fill={c.accent} letterSpacing="12">
        {`SAVE THE DATE · ${t.date.split("-").reverse().join(".")}`}
      </text>
    </>
  );
}

function Royal(x: Ctx) {
  const { c, t, ids } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  return (
    <>
      {x.hasPhoto ? (
        <g>
          <ellipse cx={CX} cy={390} rx={210} ry={250} fill="none" stroke={`url(#${ids.foil})`} strokeWidth="8" />
          <Photo ctx={x} box={{ x: CX - 196, y: 154, w: 392, h: 472 }} shape="oval" />
        </g>
      ) : (
        <Crest cx={CX} cy={400} s={1.25} text={x.d.seal.text.replace(/\s/g, "")} foil={ids.foil} c={c} font={x.names} />
      )}
      <Fit top={700} bottom={H - 190} items={[
        { k: "text", lines: [t.blessing], size: 28 * x.sb, family: x.head, fill: c.accent, spacing: 4, upper: true },
        { k: "space", h: 18 },
        { k: "text", lines: p.hosts ? wrap(p.hosts, 900, 32 * x.sb, "serif") : [], size: 32 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "text", lines: p.msg(2, 940, 34 * x.sb), size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 24 },
        p.name(t.brideName, 130),
        { k: "text", lines: ["& "], size: 56, family: x.head, fill: c.accent },
        p.name(t.groomName, 130),
        { k: "space", h: 18 },
        { k: "node", h: 40, render: (y) => <Divider cx={CX} y={y + 20} w={520} c={c} foil={ids.foil} /> },
        { k: "space", h: 14 },
        { k: "text", lines: [`${dp.weekday} · ${dp.day} ${dp.month} ${dp.year}`], size: 36 * x.sb, family: x.head, fill: c.ink, spacing: 3, upper: true },
        { k: "text", lines: p.when ? [p.when] : [], size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 10 },
        { k: "text", lines: p.where, size: 34 * x.sb, family: x.body, fill: c.ink },
      ]} />
      {p.rsvp && <text x={CX} y={H - 140} textAnchor="middle" fontSize={24} fontFamily={x.head} fill={c.accent} letterSpacing="4">{p.rsvp.toUpperCase()}</text>}
    </>
  );
}

function Arch(x: Ctx) {
  const { c, t, ids } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  const box = { x: 230, y: 170, w: W - 460, h: 650 };
  return (
    <>
      <path d={`M${box.x - 20} ${box.y + box.w / 2}A${box.w / 2 + 20} ${box.w / 2 + 20} 0 0 1 ${box.x + box.w + 20} ${box.y + box.w / 2}V${box.y + box.h + 20}H${box.x - 20}Z`} fill="none" stroke={`url(#${ids.foil})`} strokeWidth="5" />
      {x.hasPhoto ? (
        <Photo ctx={x} box={box} shape="arch" />
      ) : (
        <g>
          <path d={`M${box.x} ${box.y + box.w / 2}A${box.w / 2} ${box.w / 2} 0 0 1 ${box.x + box.w} ${box.y + box.w / 2}V${box.y + box.h}H${box.x}Z`} fill={mix(c.floralA, c.card, 0.65)} />
          <text x={CX} y={box.y + 470} textAnchor="middle" fontSize={150} fontFamily={x.names} fill={c.ink}>{x.d.seal.text.replace(/\s/g, "")}</text>
        </g>
      )}
      <FloralCluster kind={x.d.florals} x={box.x - 60} y={box.y + box.h - 220} s={0.9} c={c} />
      <FloralCluster kind={x.d.florals} x={box.x + box.w + 60} y={box.y + box.h - 220} s={0.9} c={c} flipX={-1} />
      <Fit top={880} bottom={H - 140} items={[
        { k: "text", lines: p.msg(2, 960, 34 * x.sb), size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 20 },
        p.name(`${t.brideName} & ${t.groomName}`, 116),
        { k: "space", h: 24 },
        { k: "text", lines: [`${dp.weekday} · ${dp.long}`], size: 36 * x.sb, family: x.head, fill: c.ink, spacing: 2, upper: true },
        { k: "text", lines: p.when ? [p.when] : [], size: 34 * x.sb, family: x.body, fill: c.ink },
        { k: "space", h: 12 },
        { k: "text", lines: p.where, size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 16 },
        { k: "text", lines: p.rsvp ? [p.rsvp] : [], size: 24, family: x.head, fill: c.accent, spacing: 3, upper: true },
      ]} />
    </>
  );
}

function Kandyan(x: Ctx) {
  const { c, t, ids } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  return (
    <>
      <OilLamp x={260} y={360} s={1.6} c={`url(#${ids.foil})`} />
      <OilLamp x={W - 260} y={360} s={1.6} c={`url(#${ids.foil})`} />
      {x.hasPhoto ? (
        <g>
          <circle cx={CX} cy={350} r={170} fill="none" stroke={`url(#${ids.foil})`} strokeWidth="8" />
          <Photo ctx={x} box={{ x: CX - 158, y: 192, w: 316, h: 316 }} shape="circle" />
        </g>
      ) : (
        <LotusFlower x={CX} y={360} s={2.6} c={c.floralA} line={c.accent} />
      )}
      <Fit top={560} bottom={H - 190} items={[
        { k: "text", lines: [t.sinhalaLine || "ශුභ විවාහ මංගල්‍යය"], size: 66 * x.sb, family: sinhalaFamily, fill: c.ink, weight: 600 },
        { k: "space", h: 10 },
        { k: "text", lines: [t.blessing], size: 30 * x.sb, family: x.head, fill: c.accent, spacing: 4, upper: true },
        { k: "space", h: 20 },
        { k: "text", lines: p.hosts ? wrap(p.hosts, 900, 32 * x.sb, "serif") : [], size: 32 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "text", lines: p.msg(3, 940, 34 * x.sb), size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 24 },
        p.name(t.brideName, 128),
        { k: "text", lines: ["&"], size: 60, family: x.head, fill: c.accent },
        p.name(t.groomName, 128),
        { k: "space", h: 22 },
        { k: "node", h: 40, render: (y) => <Divider cx={CX} y={y + 20} w={560} c={c} foil={ids.foil} /> },
        { k: "space", h: 12 },
        { k: "text", lines: [`${dp.weekday}, ${dp.long}`], size: 38 * x.sb, family: x.head, fill: c.ink, weight: 600 },
        { k: "text", lines: p.when ? [`Poruwa ceremony at ${p.when}`] : [], size: 32 * x.sb, family: x.body, fill: c.ink },
        { k: "space", h: 10 },
        { k: "text", lines: p.where, size: 34 * x.sb, family: x.body, fill: c.ink, italic: true },
      ]} />
      {p.rsvp && <text x={CX} y={H - 150} textAnchor="middle" fontSize={24} fontFamily={x.head} fill={c.accent} letterSpacing="3">{p.rsvp.toUpperCase()}</text>}
    </>
  );
}

function Deco(x: Ctx) {
  const { c, t, ids } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  const gold = `url(#${ids.foil})`;
  return (
    <>
      {x.hasPhoto ? (
        <g>
          <rect x={CX - 250} y={150} width={500} height={480} fill="none" stroke={gold} strokeWidth="6" />
          <Photo ctx={x} box={{ x: CX - 230, y: 170, w: 460, h: 440 }} shape="rect" />
        </g>
      ) : (
        <g>
          <Sunburst cx={CX} cy={560} r={330} foil={ids.foil} c={c} />
          <text x={CX} y={540} textAnchor="middle" fontSize={92} fontFamily={x.names} fill={gold}>{x.d.seal.text.replace(/\s/g, "")}</text>
        </g>
      )}
      <Fit top={680} bottom={H - 180} items={[
        { k: "text", lines: ["Together with their families"], size: 28 * x.sb, family: x.head, fill: c.accent, spacing: 6, upper: true },
        { k: "space", h: 26 },
        { k: "text", lines: [t.brideName || " "], size: 136 * x.sn, family: x.names, fill: gold },
        { k: "text", lines: ["— & —"], size: 40, family: x.head, fill: c.accent, spacing: 6 },
        { k: "text", lines: [t.groomName || " "], size: 136 * x.sn, family: x.names, fill: gold },
        { k: "space", h: 24 },
        { k: "text", lines: p.msg(2, 920, 32 * x.sb), size: 32 * x.sb, family: x.body, fill: c.ink, italic: true },
        { k: "space", h: 22 },
        { k: "text", lines: [`✦ ${dp.weekday} ✦ ${dp.day} ${dp.month} ${dp.year} ✦`], size: 34 * x.sb, family: x.head, fill: c.ink, spacing: 3, upper: true },
        { k: "text", lines: p.when ? [p.when] : [], size: 32 * x.sb, family: x.body, fill: c.ink },
        { k: "space", h: 10 },
        { k: "text", lines: p.where.map((w) => w.toUpperCase()), size: 30 * x.sb, family: x.head, fill: c.ink, spacing: 2 },
      ]} />
      {p.rsvp && <text x={CX} y={H - 130} textAnchor="middle" fontSize={24} fontFamily={x.head} fill={c.accent} letterSpacing="4">{p.rsvp.toUpperCase()}</text>}
    </>
  );
}

function BlackTie(x: Ctx) {
  const { c, t, ids } = x;
  const p = pieces(x);
  const dp = dateParts(t.date);
  const gold = `url(#${ids.foil})`;
  return (
    <>
      <line x1={180} x2={W - 180} y1={170} y2={170} stroke={gold} strokeWidth="3" />
      <line x1={180} x2={W - 180} y1={184} y2={184} stroke={gold} strokeWidth="1" />
      <line x1={180} x2={W - 180} y1={H - 170} y2={H - 170} stroke={gold} strokeWidth="3" />
      <line x1={180} x2={W - 180} y1={H - 184} y2={H - 184} stroke={gold} strokeWidth="1" />
      {x.hasPhoto && <Photo ctx={x} box={{ x: 230, y: 240, w: W - 460, h: 470 }} shape="rect" />}
      <Fit top={x.hasPhoto ? 760 : 300} bottom={H - 240} items={[
        { k: "text", lines: wrap("The honour of your presence is requested at the marriage of", 840, 28, "sans"), size: 28 * x.sb, family: x.body, fill: c.ink, spacing: 6, upper: true, lh: 1.6 },
        { k: "space", h: 44 },
        p.name(t.brideFull || t.brideName, 120),
        { k: "space", h: 6 },
        { k: "text", lines: ["and"], size: 34, family: x.head, fill: c.accent, spacing: 10, upper: true },
        { k: "space", h: 6 },
        p.name(t.groomFull || t.groomName, 120),
        { k: "space", h: 46 },
        { k: "text", lines: [`${dp.weekday}, the ${dp.day} of ${dp.month} ${dp.year}`], size: 32 * x.sb, family: x.head, fill: c.ink, spacing: 3, upper: true },
        { k: "text", lines: p.when ? [p.when] : [], size: 30 * x.sb, family: x.body, fill: c.ink, spacing: 3, upper: true },
        { k: "space", h: 18 },
        { k: "text", lines: p.where.map((w) => w.toUpperCase()), size: 28 * x.sb, family: x.body, fill: c.accent, spacing: 4 },
        { k: "space", h: 30 },
        { k: "text", lines: t.dressCode ? [`Dress code · ${t.dressCode}`] : [], size: 26, family: x.body, fill: c.ink, spacing: 3, upper: true },
      ]} />
    </>
  );
}

const LAYOUTS: Record<InviteDesign["card"]["layout"], (x: Ctx) => ReactNode> = {
  classic: Classic, garden: Garden, editorial: Editorial, royal: Royal, arch: Arch, kandyan: Kandyan, deco: Deco, blacktie: BlackTie,
};

export function InviteCard({ content, design, className, title }: { content: InviteContent; design: InviteDesign; className?: string; title?: string }) {
  const ids = useCardIds();
  const c = design.colors;
  const ctx: Ctx = {
    c, d: design, t: content, ids,
    names: FONTS[design.fonts.names].family,
    head: FONTS[design.fonts.headings].family,
    body: FONTS[design.fonts.body].family,
    nameKind: FONTS[design.fonts.names].kind,
    bodyKind: FONTS[design.fonts.body].kind,
    sn: design.scale.names,
    sb: design.scale.body,
    hasPhoto: Boolean(design.photo.src) && (design.photo.placement === "card" || design.photo.placement === "both"),
  };
  const outline = shapePath(design.card.shape);
  const Layout = LAYOUTS[design.card.layout] ?? Classic;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={title ?? `Wedding invitation for ${content.brideName} and ${content.groomName}`}
      xmlns="http://www.w3.org/2000/svg" data-mm="127x177.8">
      <CardDefs ids={ids} c={c} />
      <clipPath id={ids.clip}><path d={outline} /></clipPath>
      <g clipPath={`url(#${ids.clip})`}>
        <rect width={W} height={H} fill={c.card} />
        {/* Paper grain */}
        <rect width={W} height={H} fill={`url(#${ids.wash})`} opacity="0.25" />
        <Border kind={design.card.ornament} c={c} foil={ids.foil} />
        {Layout(ctx)}
      </g>
      {design.card.shape !== "rect" && <path d={outline} fill="none" stroke={mix(c.accent, c.card, 0.4)} strokeWidth="4" />}
    </svg>
  );
}
