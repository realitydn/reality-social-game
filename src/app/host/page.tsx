import Link from "next/link";
import { listPackages } from "@/lib/packages";
import Wordmark from "@/components/Wordmark";

export default async function HostLibraryPage() {
  const packages = await listPackages({ gameType: "quiz-round" });

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
          Author quiz packages and slot them into a session via Admin → Start Quiz Round.
        </p>

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
