import type { GamePresencePolicy } from "@/lib/presence";

// Setup-form controls for a game's presence tier + Account requirement. Server
// component — just form fields (names `presenceTier` / `accountRequired`, read
// by presenceConfigFromForm). Seeded with the game type's default policy.
export default function PresenceControls({ defaults }: { defaults: GamePresencePolicy }) {
  return (
    <>
      <label className="flex items-center gap-1 font-body text-xs text-ink/60">
        Presence
        <select
          name="presenceTier"
          defaultValue={String(defaults.tier)}
          className="border-2 border-ink px-1 py-0.5 font-body text-sm"
        >
          <option value="0">Not required</option>
          <option value="1">In venue (QR)</option>
          <option value="2">This session</option>
        </select>
      </label>
      <label className="flex items-center gap-1 font-body text-xs text-ink/60 self-center">
        <input
          type="checkbox"
          name="accountRequired"
          defaultChecked={defaults.accountRequired}
          className="w-4 h-4 accent-ink"
        />
        Account only
      </label>
    </>
  );
}
