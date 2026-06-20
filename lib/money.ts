// Money is stored as integer centavos everywhere. Convert only at the display
// boundary. ₱1,699.50 -> 169950.

export const toCentavos = (peso: number) => Math.round(peso * 100);
export const fromCentavos = (c: number) => c / 100;

const PHP = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

/** Full peso-symbol currency, no decimals (matches the design's `fmt`). */
export const formatPHP = (c: number) =>
  "₱" + Math.round(Math.abs(c) / 100).toLocaleString("en-US");

/** Signed amount: leading minus (−) for negatives, plus for explicit credits. */
export const formatSigned = (c: number, plus = false) =>
  (c < 0 ? "−" : plus ? "+" : "") + formatPHP(c);

/** Native Intl variant, kept for places that want grouping with the locale. */
export const formatIntl = (c: number) => PHP.format(c / 100);

/** Format a keypad draft string (pesos, e.g. "1234.5") for display. */
export function formatDraft(value: string): string {
  const [int, dec] = String(value).split(".");
  const grouped = Number(int || 0).toLocaleString("en-US");
  return "₱" + grouped + (dec !== undefined ? "." + dec : "");
}
