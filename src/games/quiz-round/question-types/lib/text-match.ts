// Pure Levenshtein-based text matching for free-text quiz answers.
// No dependencies; ~30 lines.
//
// Hosts list one or more accepted answers per question; we normalize both
// the submission and each accepted answer (lowercase, trim, collapse
// whitespace, strip diacritics) and compute the smallest edit distance.
// A small absolute threshold (1 for short answers, 2 for medium, 3 for
// long) tolerates typical typos without accepting wildly wrong guesses.

/** Normalize: lowercase, NFD-decompose to strip diacritics, collapse
 *  whitespace, trim. So "Mai Thúc Lân" → "mai thuc lan". */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Standard iterative Levenshtein with a single rolling row. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Tolerance scales with the longer string's length: 1 char up to 4,
 *  2 chars up to 8, then 3 chars + 1 per 8 chars beyond. Empirical sweet
 *  spot for typo forgiveness without false-positives. */
export function toleranceFor(length: number): number {
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  return 3 + Math.floor((length - 8) / 8);
}

/** Returns true if `submission` matches any accepted answer within the
 *  size-scaled Levenshtein threshold. Both sides are normalized first. */
export function matchesAny(submission: string, accepted: string[]): boolean {
  const norm = normalizeForMatch(submission);
  if (!norm) return false;
  for (const accept of accepted) {
    const target = normalizeForMatch(accept);
    if (!target) continue;
    if (norm === target) return true;
    const tolerance = toleranceFor(Math.max(norm.length, target.length));
    if (levenshtein(norm, target) <= tolerance) return true;
  }
  return false;
}
