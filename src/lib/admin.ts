// Comma-separated list of emails in ADMIN_EMAILS env var. Empty = no admins.
// This is a soft gate for Phase 1 — replace with role-based access when REALITY
// staff accounts are formalized.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
