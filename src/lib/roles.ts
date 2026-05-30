import { getDB } from "./db";
import { isAdminEmail } from "./admin";

export type StaffRole = "admin" | "host";

export type StaffMember = {
  email: string;
  role: StaffRole;
  user_id: string | null; // present once they've signed in with this email
  name: string | null;
};

export type StaffUser = { user_id: string; name: string | null; email: string };

function norm(email: string): string {
  return email.trim().toLowerCase();
}

function envAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Effective role for an email. ADMIN_EMAILS members are always admin (bootstrap
// seed, so you can't lock yourself out of an empty table); otherwise the table.
export async function getStaffRole(email: string | null | undefined): Promise<StaffRole | null> {
  if (!email) return null;
  if (isAdminEmail(email)) return "admin";
  const db = await getDB();
  const row = await db
    .prepare("SELECT role FROM staff_roles WHERE email = ?")
    .bind(norm(email))
    .first<{ role: string }>();
  return row?.role === "admin" ? "admin" : row?.role === "host" ? "host" : null;
}

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  return (await getStaffRole(email)) === "admin";
}

export async function isHost(email: string | null | undefined): Promise<boolean> {
  const r = await getStaffRole(email);
  return r === "admin" || r === "host"; // admins can host
}

// For /admin/staff: table roles joined to user accounts (if they've signed in).
export async function listStaff(): Promise<StaffMember[]> {
  const db = await getDB();
  const result = await db
    .prepare(
      `SELECT sr.email, sr.role, u.id AS user_id, u.name
       FROM staff_roles sr
       LEFT JOIN users u ON LOWER(u.email) = sr.email
       ORDER BY sr.role ASC, sr.email ASC`,
    )
    .all<{ email: string; role: string; user_id: string | null; name: string | null }>();
  return (result.results ?? []).map((r) => ({
    email: r.email,
    role: r.role === "admin" ? "admin" : "host",
    user_id: r.user_id,
    name: r.name,
  }));
}

export async function setStaffRole(email: string, role: StaffRole): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO staff_roles (email, role, created_at) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET role = excluded.role`,
    )
    .bind(norm(email), role, Date.now())
    .run();
}

export async function removeStaff(email: string): Promise<void> {
  const db = await getDB();
  await db.prepare("DELETE FROM staff_roles WHERE email = ?").bind(norm(email)).run();
}

// Staff who have a signed-in user account — for the host picker when starting a
// host-driven game (host events are locked to a user_id). Includes both table
// roles and ADMIN_EMAILS env admins.
export async function listStaffUsers(): Promise<StaffUser[]> {
  const db = await getDB();
  const env = envAdmins();
  const envClause = env.length ? `OR LOWER(u.email) IN (${env.map(() => "?").join(",")})` : "";
  const result = await db
    .prepare(
      `SELECT u.id AS user_id, u.name, u.email
       FROM users u
       WHERE u.email IS NOT NULL
         AND (LOWER(u.email) IN (SELECT email FROM staff_roles) ${envClause})
       ORDER BY u.name ASC`,
    )
    .bind(...env)
    .all<{ user_id: string; name: string | null; email: string }>();
  return result.results ?? [];
}
