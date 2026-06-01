import Link from "next/link";
import { listPackages } from "@/lib/packages";
import { listActiveSessions } from "@/lib/sessions";
import { getCurrentUser } from "@/lib/session";
import { CAPABILITY, can } from "@/lib/roles";
import Wordmark from "@/components/Wordmark";

export default async function HostHomePage() {
  const packages = await listPackages({ gameType: "quiz-round" });
  const user = await getCurrentUser();
  // Hosts granted create:session can run their own night; admins always can.
  const canCreate = await can(user?.email, CAPABILITY.CREATE_SESSION);
  // Active sessions this host created — their own slots to run / resume.
  const active = await listActiveSessions();
  const mySessions = user ? active.filter((s) => s.created_by === user.id) : [];

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <Link
          href="/host/packages/new"
          className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
          style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          + New package
        </Link>
      </header>
      <section className="flex-1 px-6 max-w-3xl w-full mx-auto pb-12">
        <h1
          className="font-display font-bold text-3xl uppercase mb-1"
          style={{ letterSpacing: "0.05em" }}
        >
          Host
        </h1>
        <p className="font-body text-ink/60 text-sm mb-8">
          {canCreate
            ? "Run your own night and author quiz packages."
            : "Author quiz packages. An admin starts the session and hands you the controls."}
        </p>

        {canCreate && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="font-display font-semibold text-sm uppercase"
                style={{ letterSpacing: "0.05em" }}
              >
                Your sessions
              </h2>
              <Link
                href="/session/new"
                className="bg-ink text-cream font-display font-bold uppercase px-4 py-2 transition hover:translate-y-0.5"
                style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
              >
                + New session
              </Link>
            </div>
            {mySessions.length === 0 ? (
              <p className="font-body text-ink/50 text-sm">
                No active sessions. Start one to run your games.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {mySessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/session/${s.id}/manage`}
                      className="flex items-center justify-between border-2 border-ink px-4 py-3 hover:bg-yellow transition"
                    >
                      <span
                        className="font-display font-semibold uppercase"
                        style={{ letterSpacing: "0.05em" }}
                      >
                        {s.name}
                      </span>
                      <span className="font-body text-xs text-ink/60">{s.id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <h2
          className="font-display font-semibold text-sm uppercase mb-4"
          style={{ letterSpacing: "0.05em" }}
        >
          Packages ({packages.length})
        </h2>

        {packages.length === 0 ? (
          <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
            No packages yet. Create one to get started.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {packages.map((pkg) => {
              const questionCount =
                ((pkg.content as { questions?: unknown[] }).questions?.length) ?? 0;
              return (
                <li key={pkg.id}>
                  <Link
                    href={`/host/packages/${pkg.id}`}
                    className="border-2 border-ink p-4 transition hover:bg-yellow flex items-center justify-between"
                  >
                    <div>
                      <p
                        className="font-display font-bold text-lg uppercase"
                        style={{ letterSpacing: "0.05em" }}
                      >
                        {pkg.name}
                      </p>
                      <p className="font-body text-xs text-ink/60">
                        {questionCount} question{questionCount === 1 ? "" : "s"} · by{" "}
                        {pkg.author_name ?? "Unknown"} · {pkg.status}
                      </p>
                    </div>
                    <span className="font-body text-xs text-ink/40">
                      {new Date(pkg.updated_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
