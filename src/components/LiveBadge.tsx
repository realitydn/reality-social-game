type Props = { connected: boolean; className?: string };

// Tiny status dot so a host or player can tell live realtime from the polling
// fallback. Polling keeps data fresh either way, but this distinguishes "live"
// from "reconnecting" — important when a host is deciding whether the counts
// they're looking at are current before they reveal/advance.
export default function LiveBadge({ connected, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-display font-semibold text-[10px] uppercase ${className}`}
      style={{ letterSpacing: "0.05em" }}
      title={connected ? "Realtime connected" : "Reconnecting — still updating every few seconds"}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${connected ? "bg-green" : "bg-amber"}`}
        aria-hidden
      />
      {connected ? "Live" : "Reconnecting"}
    </span>
  );
}
