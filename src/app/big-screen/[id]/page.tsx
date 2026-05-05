import { notFound } from "next/navigation";
import { getSession, listPlayers } from "@/lib/sessions";
import { getBaseUrl } from "@/lib/url";
import QRCodeSVG from "@/components/QRCode";
import AttendeeList from "@/components/AttendeeList";

// Big-screen / projector view. Public, no auth — venue staff opens this on a
// browser pointed at the projector. Inverted REALITY palette (ink ground +
// cream + a chromatic accent) for high contrast and visual punch.
export default async function BigScreenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const baseUrl = await getBaseUrl();
  const joinUrl = `${baseUrl}/s/${session.id}`;
  const players = await listPlayers(session.id);

  return (
    <main className="min-h-dvh bg-ink text-cream flex flex-col">
      <header className="flex items-center justify-between px-10 pt-10">
        <div
          className="font-mark font-semibold text-3xl uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          REALITY
        </div>
        <div
          className="font-display font-bold text-xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          {session.name}
        </div>
      </header>

      <section className="flex-1 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 px-10 py-10 items-center">
        <div className="flex flex-col items-center gap-4">
          <QRCodeSVG value={joinUrl} size={420} />
          <p
            className="font-display font-bold text-sm uppercase text-cream"
            style={{ letterSpacing: "0.05em" }}
          >
            Scan to join
          </p>
          <p className="font-body text-cream/60 text-xs break-all max-w-[420px] text-center">
            {joinUrl}
          </p>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <p
            className="font-display font-semibold text-xs uppercase text-cream/60"
            style={{ letterSpacing: "0.05em" }}
          >
            In the room
          </p>
          <AttendeeList sessionId={session.id} initial={players} variant="big-screen" pollMs={2000} />
        </div>
      </section>

      <footer className="px-10 pb-8 text-center font-body text-xs text-cream/50">
        86 Mai Thúc Lân, Đà Nẵng · realitydn.com
      </footer>
    </main>
  );
}
