import { getTranslations } from "next-intl/server";
import {
  allTimeLeaderboard,
  tonightLeaderboard,
  weekLeaderboard,
  type LeaderboardEntry,
} from "@/lib/leaderboards";
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

type Tab = "tonight" | "week" | "all";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab =
    params.tab === "week" ? "week" : params.tab === "all" ? "all" : "tonight";
  const t = await getTranslations("leaderboard");

  const entries =
    tab === "tonight"
      ? await tonightLeaderboard()
      : tab === "week"
        ? await weekLeaderboard()
        : await allTimeLeaderboard();

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
        <p className="font-body text-ink/60 text-sm mb-8">{t("subtitle")}</p>

        <nav className="flex gap-2 mb-6 flex-wrap">
          <TabLink current={tab} target="tonight" label={t("tonight")} />
          <TabLink current={tab} target="week" label={t("week")} />
          <TabLink current={tab} target="all" label={t("allTime")} />
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

function TabLink({
  current,
  target,
  label,
}: {
  current: Tab;
  target: Tab;
  label: string;
}) {
  const active = current === target;
  return (
    <a
      href={`/leaderboard?tab=${target}`}
      className={`font-display font-bold uppercase text-xs px-4 py-2 border-2 border-ink transition ${
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
