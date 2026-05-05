// FNV-1a 32-bit hash. Deterministic across runtimes — used for stable shuffles
// (e.g. seeding a player's Bingo card from sessionId + userId + gameId).
export function fnv1a(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
