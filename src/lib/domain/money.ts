import type { LKR } from "./types";

const grouping = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });
const receipt = new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `LKR 3,500,000` — whole rupees for summaries. */
export function formatLKR(amount: LKR): string {
  const sign = amount < 0 ? "−" : "";
  return `${sign}LKR ${grouping.format(Math.abs(Math.round(amount)))}`;
}

/** `3,500,000` — figure without the currency code (the code is set separately). */
export function formatAmount(amount: LKR): string {
  return grouping.format(Math.round(amount));
}

/** `LKR 400,000.00` — receipts and payment records only. */
export function formatLKRExact(amount: LKR): string {
  return `LKR ${receipt.format(amount)}`;
}

/** Compact form for tight spaces: `LKR 3.5M`, `LKR 850K`. */
export function formatLKRCompact(amount: LKR): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}LKR ${trim(abs / 1_000_000)}M`;
  if (abs >= 10_000) return `${sign}LKR ${Math.round(abs / 1000)}K`;
  return formatLKR(amount);
}

function trim(n: number): string {
  return n.toFixed(n >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

/**
 * Round an estimate so it does not claim more precision than it has.
 * Savings and projections are rounded to the nearest LKR 5,000
 * (or LKR 1,000 under LKR 20,000).
 */
export function roundEstimate(amount: LKR): LKR {
  const step = Math.abs(amount) < 20_000 ? 1_000 : 5_000;
  return Math.round(amount / step) * step;
}

/** Whole-percent ratio, safe for zero denominators. */
export function percent(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** Parse user input like `LKR 3,500,000` or `3500000` to whole rupees. */
export function parseLKR(input: string): LKR | null {
  const cleaned = input.replace(/lkr|rs\.?|,|\s/gi, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}
