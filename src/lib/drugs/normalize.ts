/**
 * Arabic/Latin normalisation shared by the catalogue index and the UI.
 * Kept dependency-free so it can run on the client as well.
 */

const ARABIC_FOLD: Array<[RegExp, string]> = [
  [/[\u0623\u0625\u0622\u0671]/g, "\u0627"], // أ إ آ ٱ → ا
  [/[\u0649\u06CC]/g, "\u064A"], // ى ی → ي
  [/[\u0629\u06C0]/g, "\u0647"], // ة ۀ → ه
  [/[\u0624\u0626\u0621\u0640]/g, ""], // ؤ ئ ء ـ
];

export function normalizeDrugKey(input: string): string {
  if (!input) return "";
  let value = input.toLowerCase();
  for (const [pattern, replacement] of ARABIC_FOLD) {
    value = value.replace(pattern, replacement);
  }
  return value
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeDrugKey(input: string): string[] {
  const key = normalizeDrugKey(input);
  return key ? key.split(" ") : [];
}
