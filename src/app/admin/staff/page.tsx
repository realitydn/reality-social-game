import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  isAdmin,
  listStaff,
  removeStaff,
  setStaffRole,
  type StaffRole,
} from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import Wordmark from "@/components/Wordmark";

export default async function AdminStaffPage() {
  const staff = await listStaff();

  async function upsertStaff(formData: FormData) {
    "use server";
    const u = await getCurrentUser();
    if (!u || !(await isAdmin(u.email))) return;
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    const roleRaw = String(formData.get("role") ?? "");
    const role: StaffRole = roleRaw === "admin" ? "admin" : "host";
    await setStaffRole(email, role);
    revalidatePath("/admin/staff");
  }

  async function deleteStaff(formData: FormData) {
    "use server";
    const u = await getCurrentUser();
    if (!u || !(await isAdmin(u.email))) return;
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await removeStaff(email);
    revalidatePath("/admin/staff");
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <Link
          href="/admin"
          className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink"
          style={{ letterSpacing: "0.05em" }}
        >
          ← Admin
        </Link>
      </header>
      <section className="flex-1 px-6 max-w-2xl w-full mx-auto pb-12">
        <h1 className="font-display font-bold text-3xl uppercase mb-2" style={{ letterSpacing: "0.05em" }}>
          Staff
        </h1>
        <p className="font-body text-ink/60 text-sm mb-8">
          Admins manage sessions and games; hosts can run host-driven games.
          ADMIN_EMAILS env admins are always admin and may not appear below.
        </p>

        <form
          action={upsertStaff}
          className="flex flex-wrap gap-2 items-stretch border-2 border-ink p-3 mb-10"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="email@reality.bar"
            className="flex-1 min-w-[12rem] border-2 border-ink bg-cream px-3 py-2 font-body focus:outline-none focus:bg-yellow"
          />
          <select
            name="role"
            defaultValue="host"
            className="border-2 border-ink bg-cream px-3 py-2 font-body text-sm focus:outline-none focus:bg-yellow"
          >
            <option value="host">Host</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="bg-ink text-cream font-display font-bold uppercase px-5 py-2 transition hover:translate-y-0.5"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Add / update
          </button>
        </form>

        <h2 className="font-display font-semibold text-sm uppercase mb-4" style={{ letterSpacing: "0.05em" }}>
          Roles ({staff.length})
        </h2>
        {staff.length === 0 ? (
          <p className="font-body text-ink/50">No staff roles set.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {staff.map((s) => (
              <li
                key={s.email}
                className="flex items-center justify-between gap-3 border-2 border-ink px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-display font-semibold uppercase truncate" style={{ letterSpacing: "0.05em" }}>
                    {s.email}
                  </p>
                  <p className="font-body text-xs text-ink/60">
                    {s.role}
                    {s.user_id ? " · (signed in)" : ""}
                    {s.name ? ` · ${s.name}` : ""}
                  </p>
                </div>
                <form action={deleteStaff} className="shrink-0">
                  <input type="hidden" name="email" value={s.email} />
                  <ConfirmSubmitButton
                    className="border-2 border-red text-red font-display font-bold uppercase px-4 py-2 text-sm transition hover:bg-red hover:text-cream"
                    style={{ letterSpacing: "0.05em" }}
                    title="Remove staff role?"
                    body={`Removes the ${s.role} role for ${s.email}. They keep their account but lose staff access.`}
                    confirmLabel="Remove"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
