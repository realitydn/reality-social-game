import { notFound } from "next/navigation";
import Link from "next/link";
import { getPackage } from "@/lib/packages";
import PackagePreview from "@/components/host/PackagePreview";

// Solo dry-run mode. The host plays through the package themselves to verify
// content + reveal flow. No persistence, no other players, no scoring.
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackage(id);
  if (!pkg) notFound();

  return (
    <main className="min-h-dvh bg-ink text-cream flex flex-col">
      <header className="flex items-center justify-between p-6">
        <div
          className="font-mark font-semibold text-xl uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          REALITY · Preview
        </div>
        <Link
          href={`/host/packages/${pkg.id}`}
          className="border-2 border-cream text-cream font-display font-bold uppercase px-4 py-2 transition hover:bg-cream hover:text-ink"
          style={{ letterSpacing: "0.05em" }}
        >
          ← Back to editor
        </Link>
      </header>
      <PackagePreview pkg={pkg} />
    </main>
  );
}
