type Props = {
  url: string | null;
  name: string | null;
  /** Pixel size of the square avatar. */
  size?: number;
  className?: string;
};

// Square avatar with an initials fallback. Plain <img> rather than next/image
// so we don't have to register the R2 custom domain in next.config.ts (matches
// AvatarUpload). Cream box + ink border reads on every REALITY background —
// the cream attendee cards, the chromatic leaderboard swatches, and the ink
// projector ground. Used by AttendeeList, Leaderboard, and the big screen so
// the photos players upload actually show up in the room and on the projector.
export default function PlayerAvatar({ url, name, size = 32, className = "" }: Props) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden border-2 border-ink bg-cream text-ink shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-display font-bold leading-none"
          style={{ fontSize: Math.round(size * 0.45), letterSpacing: "0.02em" }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
