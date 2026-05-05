// Short, human-friendly IDs for session URLs. 6 chars from a 32-symbol alphabet
// (no 0/1/I/O to avoid ambiguity when typing). 32^6 = ~1B values — plenty for one bar.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function shortId(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
