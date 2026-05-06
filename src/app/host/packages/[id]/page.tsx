import { notFound } from "next/navigation";
import Link from "next/link";
import { getPackage } from "@/lib/packages";
import Wordmark from "@/components/Wordmark";
import PackageEditor from "@/components/host/PackageEditor";

export default async function PackageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackage(id);
  if (!pkg) notFound();

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6 sticky top-0 bg-cream z-10 border-b border-ink/10">
        <Wordmark />
        <div className="flex items-center gap-3">
          <Link
            href={`/host/packages/${pkg.id}/preview`}
            className="border-2 border-ink text-ink font-display font-bold uppercase px-4 py-2 transition hover:bg-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            Preview
          </Link>
          <Link
            href="/host"
            className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink"
            style={{ letterSpacing: "0.05em" }}
          >
            ← Library
          </Link>
        </div>
      </header>
      <section className="flex-1 px-6 max-w-4xl w-full mx-auto pt-6 pb-32">
        <PackageEditor pkg={pkg} />
      </section>
    </main>
  );
}
