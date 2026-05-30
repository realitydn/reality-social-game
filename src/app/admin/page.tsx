import Link from "next/link";
import { listActiveSessions } from "@/lib/sessions";
import Wordmark from "@/components/Wordmark";

export default async function AdminHome() {
  const active = await listActiveSessions();
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <div className="flex items-center gap-4">
          <Link
            href="/admin/staff"
            className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink"
            style={{ letterSpacing: "0.05em" }}
          >
            Staff
          </Link>
          <span className="font-display font-semibold text-xs uppercase text-ink/60" style={{ letterSpacing: "0.05em" }}>
            Admin
          </span>
        </div>
      </header>
      <section className="flex-1 px-6 max-w-2xl w-full mx-auto">
        <h1 className="font-display font-bold text-3xl uppercase mb-8" style={{ letterSpacing: "0.05em" }}>
          Sessions
        </h1>
        <Link
          href="/admin/session/new"
          className="inline-block bg-ink text-cream font-display font-bold uppercase px-6 py-3 mb-8 transition hover:translate-y-0.5"
          style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          + New session
        </Link>

        <h2 className="font-display font-semibold text-sm uppercase mb-4" style={{ letterSpacing: "0.05em" }}>
          Active
        </h2>
        {active.length === 0 ? (
          <p className="font-body text-ink/50">No active sessions.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/session/${s.id}`}
                  className="flex items-center justify-between border-2 border-ink px-4 py-3 hover:bg-yellow transition"
                >
                  <span className="font-display font-semibold uppercase" style={{ letterSpacing: "0.05em" }}>
                    {s.name}
                  </span>
                  <span className="font-body text-xs text-ink/60">{s.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
