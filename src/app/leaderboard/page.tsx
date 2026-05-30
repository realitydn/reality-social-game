import { getTranslations } from "next-intl/server";
import { getLeaderboard, type LeaderboardEntry, type LeaderboardWindow } from "@/lib/leaderboards";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Wordmark from "@/components/Wordmark";

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

const SCOPES = [
  { key: "everything", gameType: undefined as string | undefined, labelKey: "everything" },
  { key: "quiz-round", gameType: "quiz-round", labelKey: "pubQuiz" },
  { key: "karaoke-queue", gameType: "karaoke-queue", labelKey: "karaoke" },
  { key: "disposable-camera", gameType: "disposable-camera", labelKey: "paparazzi" },
] as const;

const WINDOWS: { key: LeaderboardWindow; labelKey: string }[] = [
  { key: "tonight", labelKey: "tonight" },
  { key: "week", labelKey: "week" },
  { key: "all", labelKey: "allTime" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; game?: string }>;
}) {
  const params = await searchParams;
  const tab: LeaderboardWindow =
    params.tab === "week" ? "week" : params.tab === "all" ? "all" : "tonight";
  const scope = SCOPES.find((s) => s.key === params.game) ?? SCOPES[0];
  const t = await getTranslations("leaderboard");

  const entries = await getLeaderboard(tab, scope.gameType);

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <LocaleSwitcher />
      </header>

      <section className="flex-1 px-6 max-w-2xl w-full mx-auto pb-12">
        <h1
          className="font-display font-bold text-3xl uppercase mb-2"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("heading")}
        </h1>
        <p className="font-body text-ink/60 text-sm mb-6">{t("subtitle")}</p>

        {/* Game scope */}
        <nav className="flex gap-2 mb-3 flex-wrap">
          {SCOPES.map((s) => (
            <PillLink
              key={s.key}
              href={`/leaderboard?tab=${tab}&game=${s.key}`}
              active={s.key === scope.key}
              label={t(s.labelKey)}
            />
          ))}
        </nav>
        {/* Time window */}
        <nav className="flex gap-2 mb-6 flex-wrap">
          {WINDOWS.map((w) => (
            <PillLink
              key={w.key}
              href={`/leaderboard?tab=${w.key}&game=${scope.key}`}
              active={w.key === tab}
              label={t(w.labelKey)}
              small
            />
          ))}
        </nav>

        {entries.length === 0 ? (
          <p className="font-body text-ink/50 py-8 text-center">{t("empty")}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {entries.map((entry, i) => (
              <Entry key={entry.user_id} entry={entry} rank={i + 1} />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function PillLink({
  href,
  active,
  label,
  small = false,
}: {
  href: string;
  active: boolean;
  label: string;
  small?: boolean;
}) {
  return (
    <a
      href={href}
      className={`font-display font-bold uppercase ${small ? "text-[11px] px-3 py-1.5" : "text-xs px-4 py-2"} border-2 border-ink transition ${
        active ? "bg-ink text-cream" : "bg-cream text-ink hover:bg-yellow"
      }`}
      style={{ letterSpacing: "0.05em" }}
    >
      {label}
    </a>
  );
}

function Entry({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const swatch = SWATCH_BG[(rank - 1) % SWATCH_BG.length];
  return (
    <li
      className={`flex items-center justify-between gap-4 p-4 border-2 border-ink ${
        rank <= 3 ? swatch : "bg-cream"
      }`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <span
          className="font-display font-bold text-2xl tabular-nums"
          style={{ letterSpacing: "0.05em" }}
        >
          {rank}
        </span>
        <div className="min-w-0">
          <p
            className="font-display font-bold uppercase truncate"
            style={{ letterSpacing: "0.05em" }}
          >
            {entry.display_name}
          </p>
          <p className="font-body text-xs text-ink/60">
            {entry.sessions_played} session{entry.sessions_played === 1 ? "" : "s"}
            {entry.is_guest ? " · guest" : ""}
          </p>
        </div>
      </div>
      <span className="font-display font-bold text-2xl">{entry.total_score}</span>
    </li>
  );
}
