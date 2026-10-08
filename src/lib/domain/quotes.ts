import { budgetCategory } from "./catalog";
import type { BudgetCategoryId, LKR, Vendor, VendorQuote } from "./types";

/**
 * Quote comparison and the Value Score.
 *
 * Value Score (0–100) is a transparent weighted blend:
 *   - Cost efficiency  40% — lowest true cost in the comparison ÷ this quote's true cost
 *   - Quality          35% — the couple's vendor rating, else review score (out of 5)
 *   - Deliverables     25% — share of the compared features this package includes
 *
 * True cost = package price + additional charges + overtime + transport + taxes.
 * The cheapest option is labelled "Lowest Cost" but never auto-selected.
 */

export const VALUE_WEIGHTS = { cost: 0.4, quality: 0.35, deliverables: 0.25 } as const;

export function trueCost(q: VendorQuote): LKR {
  return q.price + q.additionalCharges + q.overtime + q.transport + q.taxes;
}

export function hiddenCosts(q: VendorQuote): LKR {
  return trueCost(q) - q.price;
}

export type QuoteLabel = "best_value" | "lowest_cost" | "premium";

export interface ScoredQuote {
  quote: VendorQuote;
  vendor: Vendor | undefined;
  trueCost: LKR;
  hidden: LKR;
  /** Hidden costs as a whole % of the package price. */
  hiddenPct: number;
  scores: { cost: number; quality: number | null; deliverables: number | null };
  valueScore: number;
  labels: QuoteLabel[];
}

export function scoreQuotes(
  quotes: VendorQuote[],
  vendors: Vendor[],
  categoryId: BudgetCategoryId,
): ScoredQuote[] {
  if (quotes.length === 0) return [];
  const features = budgetCategory(categoryId).compareFeatures;
  const costs = quotes.map(trueCost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  const scored = quotes.map((quote, i) => {
    const vendor = vendors.find((v) => v.id === quote.vendorId);
    const cost = costs[i] > 0 ? Math.round((minCost / costs[i]) * 100) : 100;
    const rating = vendor?.rating ?? quote.reviewScore;
    const quality = rating !== null && rating !== undefined ? Math.round((rating / 5) * 100) : null;
    const deliverables = features.length
      ? Math.round((features.filter((f) => quote.features[f.key]).length / features.length) * 100)
      : null;

    // Re-normalise weights over the signals we actually have, so a missing
    // rating does not silently count as zero.
    let weight = VALUE_WEIGHTS.cost;
    let total = cost * VALUE_WEIGHTS.cost;
    if (quality !== null) {
      total += quality * VALUE_WEIGHTS.quality;
      weight += VALUE_WEIGHTS.quality;
    }
    if (deliverables !== null) {
      total += deliverables * VALUE_WEIGHTS.deliverables;
      weight += VALUE_WEIGHTS.deliverables;
    }
    const hidden = hiddenCosts(quote);
    return {
      quote,
      vendor,
      trueCost: costs[i],
      hidden,
      hiddenPct: quote.price > 0 ? Math.round((hidden / quote.price) * 100) : 0,
      scores: { cost, quality, deliverables },
      valueScore: Math.round(total / weight),
      labels: [] as QuoteLabel[],
    };
  });

  if (scored.length > 1) {
    const best = scored.reduce((a, b) => (b.valueScore > a.valueScore ? b : a));
    best.labels.push("best_value");
    scored.find((s) => s.trueCost === minCost)?.labels.push("lowest_cost");
    if (maxCost > minCost) scored.find((s) => s.trueCost === maxCost)?.labels.push("premium");
  }
  return scored;
}

export const QUOTE_LABEL: Record<QuoteLabel, string> = {
  best_value: "Best Value",
  lowest_cost: "Lowest Cost",
  premium: "Premium",
};
