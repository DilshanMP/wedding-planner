import { contrast, isLight, mix } from "@/lib/theme-colors";
import type { OutfitPlan } from "./planner";
import type { ScoredQuote } from "./quotes";
import { formatLKR } from "./money";

export interface Tip {
  text: string;
  /** Colours the tip is about, shown as swatches. */
  colors: string[];
}

function distance(a: string, b: string): number {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/**
 * Plain-language styling advice from the outfit colours and the wedding
 * colours: harmony with the decor, contrast in photos, and the classic
 * Kandyan and going-away choices.
 */
export function outfitAdvice(outfits: OutfitPlan[], palette: string[]): Tip[] {
  const tips: Tip[] = [];
  const [main, accent] = [palette[0] ?? "#7b1e2b", palette[1] ?? "#c9a24a"];
  const bride = outfits.filter((o) => o.who === "bride");
  const groom = outfits.filter((o) => o.who === "groom");
  const poruwa = bride.find((o) => /poruwa|kandyan|osariya/i.test(`${o.moment} ${o.description}`));
  const goingAway = bride.find((o) => /going/i.test(o.moment));
  const suit = groom.find((o) => /suit/i.test(`${o.moment} ${o.description}`));

  if (poruwa) {
    tips.push({
      text: isLight(poruwa.color)
        ? "A light Osariya glows against a decorated Poruwa. Let the jewellery and the pota frill carry your gold — keep the Poruwa flowers white or in your accent colour."
        : "A deep-coloured Osariya is striking. Make sure the Poruwa backdrop is lighter so you don't blend into it in photos.",
      colors: [poruwa.color, accent],
    });
  }
  if (goingAway) {
    const close = distance(goingAway.color, main) < 60 || distance(goingAway.color, accent) < 60;
    tips.push({
      text: close
        ? "Your going-away outfit matches your wedding colours — it will look planned and elegant with the decor in every reception photo."
        : `Your going-away colour stands apart from the decor. That's lovely for contrast; tie it in with an accessory or bouquet in ${accent === goingAway.color ? "your main colour" : "your accent colour"}.`,
      colors: [goingAway.color, main, accent],
    });
    if (poruwa && distance(goingAway.color, poruwa.color) < 50) {
      tips.push({ text: "Your Poruwa and going-away outfits are very similar in colour. A clearer change makes the evening feel like two moments in the photos.", colors: [poruwa.color, goingAway.color] });
    }
  }
  if (suit) {
    tips.push({
      text: isLight(suit.color)
        ? "A light suit suits an evening wedding if the hall is warm-lit; a darker tie in your main colour keeps it from looking washed out."
        : `A dark suit photographs well at night. Add a pocket square or tie in ${goingAway ? "the bride's going-away colour" : "your accent colour"} so you look like a pair.`,
      colors: [suit.color, goingAway?.color ?? accent],
    });
    if (goingAway && contrast(suit.color, goingAway.color) < 1.6) {
      tips.push({ text: "The suit and going-away colours are close in brightness. Side by side, a little more contrast (lighter dress or darker suit) helps you both stand out.", colors: [suit.color, goingAway.color] });
    }
  }
  tips.push({ text: `For bridesmaids and best men, a softer version of your main colour keeps the group in harmony.`, colors: [mix(main, "#ffffff", 0.55), main] });
  tips.push({ text: "Evening functions under warm lights deepen colours. Check fabric swatches under the hall's lighting, not daylight.", colors: [accent] });
  return tips;
}

/**
 * A short recommendation for a set of quotes in one category: which is the
 * best value and why, what the cheapest leaves out, what the premium buys,
 * hidden charges, and how it fits the budget line.
 */
export function compareAdvice(scored: ScoredQuote[], planned: number | null, featureLabels: Record<string, string>): string[] {
  if (scored.length < 2) return scored.length === 1 ? ["Add one or two more quotes to compare — even a rough one helps you negotiate."] : [];
  const tips: string[] = [];
  const byValue = [...scored].sort((a, b) => b.valueScore - a.valueScore);
  const byCost = [...scored].sort((a, b) => a.trueCost - b.trueCost);
  const best = byValue[0];
  const cheapest = byCost[0];
  const priciest = byCost[byCost.length - 1];
  const name = (s: ScoredQuote) => s.vendor?.name ?? s.quote.packageName;
  const missing = (a: ScoredQuote, b: ScoredQuote) => Object.keys(b.quote.features).filter((k) => b.quote.features[k] && !a.quote.features[k]).map((k) => featureLabels[k] ?? k);

  tips.push(`Best value: ${name(best)} (${best.valueScore}/100) at ${formatLKR(best.trueCost)} all-in.`);
  if (cheapest !== best) {
    const gap = best.trueCost - cheapest.trueCost;
    const lacks = missing(cheapest, best);
    tips.push(`${name(cheapest)} is ${formatLKR(gap)} cheaper${lacks.length ? `, but leaves out ${lacks.slice(0, 3).join(", ").toLowerCase()}` : ""}. ${lacks.length ? "Ask if they can add those for less than the difference." : "If the quality is similar, it's the smart saving."}`);
  }
  if (priciest !== best && priciest !== cheapest) {
    const extra = missing(best, priciest);
    tips.push(`${name(priciest)} costs ${formatLKR(priciest.trueCost - best.trueCost)} more than ${name(best)}${extra.length ? ` for ${extra.slice(0, 3).join(", ").toLowerCase()}` : " with no extra deliverables"}.`);
  }
  for (const s of scored) if (s.hiddenPct >= 10) tips.push(`${name(s)} adds ${s.hiddenPct}% on top of the package price (transport, overtime, taxes). Ask for an all-inclusive price in writing.`);
  if (planned) {
    const fits = scored.filter((s) => s.trueCost <= planned);
    tips.push(fits.length === scored.length ? `All of these fit your planned ${formatLKR(planned)}.` : fits.length ? `${fits.map(name).join(" and ")} fit${fits.length === 1 ? "s" : ""} your planned ${formatLKR(planned)}.` : `Every quote is above your planned ${formatLKR(planned)} — negotiate, or move money from a lower-priority category.`);
  }
  return tips;
}
