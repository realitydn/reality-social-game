"use client";

import type {
  OrderingData,
  OrderingItem,
} from "@/games/quiz-round/question-types/ordering";

type Props = {
  questionId: string;
  data: OrderingData;
  onChange: (data: OrderingData) => void;
};

// ≥44px hit area (WCAG/Apple touch minimum) — these were ~28px and packed
// tightly, hard to hit on the phones hosts actually author on.
const ICON_BTN =
  "min-w-[44px] min-h-[44px] flex items-center justify-center border-2 text-lg leading-none disabled:opacity-30";

export default function OrderingEditor({ data, onChange }: Props) {
  const updateItem = (i: number, text: string) => {
    const items = data.items.map((it, idx) => (idx === i ? { ...it, text } : it));
    onChange({ ...data, items });
  };

  const addItem = () => {
    onChange({
      ...data,
      items: [...data.items, { id: crypto.randomUUID(), text: "" }],
    });
  };

  const removeItem = (i: number) => {
    if (data.items.length <= 2) return;
    onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) });
  };

  const move = (i: number, dir: -1 | 1) => {
    const next: OrderingItem[] = [...data.items];
    const target = i + dir;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onChange({ ...data, items: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={data.prompt}
        onChange={(e) => onChange({ ...data, prompt: e.target.value })}
        placeholder="Question prompt — e.g. 'Order these REALITY events by year'"
        rows={2}
        className="border-2 border-ink px-3 py-2 font-body text-base"
      />

      <p
        className="font-display font-semibold text-xs uppercase text-ink/60 mt-1"
        style={{ letterSpacing: "0.05em" }}
      >
        Items in correct order (each player sees them shuffled)
      </p>
      <ol className="flex flex-col gap-2">
        {data.items.map((it, i) => (
          <li key={it.id} className="flex items-center gap-2">
            <span className="font-display font-bold text-lg tabular-nums w-6 text-right">
              {i + 1}.
            </span>
            <input
              type="text"
              value={it.text}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`Item ${i + 1}`}
              className="border-2 border-ink px-3 py-2 font-body text-base flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className={`${ICON_BTN} border-ink`}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === data.items.length - 1}
              className={`${ICON_BTN} border-ink`}
              aria-label="Move down"
            >
              ↓
            </button>
            {data.items.length > 2 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className={`${ICON_BTN} border-red text-red ml-2`}
                aria-label={`Remove item ${i + 1}`}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={addItem}
        disabled={data.items.length >= 8}
        className="font-display font-bold text-xs uppercase text-ink/60 hover:text-ink self-start disabled:opacity-30"
        style={{ letterSpacing: "0.05em" }}
      >
        + Add item
      </button>
    </div>
  );
}
