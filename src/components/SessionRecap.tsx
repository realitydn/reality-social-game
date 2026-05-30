import { getTranslations } from "next-intl/server";
import type { SessionPlayer } from "@/lib/sessions";

const SWATCH_BG = [
  "bg-yellow",
  "bg-amber",
  "bg-red",
  "bg-pink",
  "bg-purple",
  "bg-blue",
  "bg-teal",
  "bg-green",
];

// Big-screen end-of-session splash. Shown when session.ends_at is set —
// no QR, no attendee polling, just the night's winners.
export default async function SessionRecap({
  sessionName,
  players,
}: {
  sessionName: string;
  players: SessionPlayer[];
}) {
  const t = await getTranslations("recap");
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="flex-1 flex flex-col px-10 py-10">
      <div className="text-center mb-10">
        <p
          className="font-display font-semibold text-sm uppercase text-cream/60 mb-2"
          style={{ letterSpacing: "0.1em" }}
        >
          {t("ended")}
        </p>
        <h1
          className="font-display font-bold text-6xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          {sessionName}
        </h1>
      </div>

      {podium.length === 0 ? (
        <p className="font-body text-center text-cream/70 py-12">{t("noScores")}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 items-stretch">
            {podium.map((p, i) => (
              <div
                key={p.user_id}
                className={`${SWATCH_BG[i]} text-ink p-8 flex flex-col items-center justify-center ${i === 0 ? "md:-translate-y-3 md:order-2" : i === 1 ? "md:order-1" : "md:order-3"}`}
                style={{ boxShadow: "0 12px 3px rgba(13, 9, 5, 0.3)" }}
              >
                <div
                  className={`font-display font-bold mb-2 tabular-nums ${i === 0 ? "text-8xl" : "text-7xl"}`}
                  style={{ letterSpacing: "0.05em" }}
                >
                  {i + 1}
                </div>
                <div
                  className={`font-display font-bold uppercase text-center mb-2 break-words ${i === 0 ? "text-3xl" : "text-2xl"}`}
                  style={{ letterSpacing: "0.05em" }}
                >
                  {p.display_name}
                </div>
                <div className={`font-display font-bold ${i === 0 ? "text-5xl" : "text-4xl"}`}>
                  {p.score}
                </div>
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {rest.map((p, i) => (
                <div
                  key={p.user_id}
                  className="bg-cream text-ink px-3 py-2 flex items-center justify-between gap-2"
                >
                  <span
                    className="font-display font-bold uppercase text-sm truncate"
                    style={{ letterSpacing: "0.05em" }}
                    title={p.display_name}
                  >
                    {i + 4}. {p.display_name}
                  </span>
                  <span className="font-display font-bold text-lg shrink-0">{p.score}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p
        className="font-display font-semibold text-xs uppercase text-cream/50 text-center mt-auto pt-10"
        style={{ letterSpacing: "0.1em" }}
      >
        {t("catchNext")}
      </p>
    </div>
  );
}
