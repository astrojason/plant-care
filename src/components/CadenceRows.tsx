import type { Plant } from "@/lib/types/plant";
import { daysPastDue } from "@/lib/care/schedule";

const ROWS: {
  label: string;
  last: "lastWateredAt" | "lastFertilizedAt" | "lastMistedAt";
  interval: "wateringIntervalDays" | "fertilizingIntervalDays" | "mistingIntervalDays";
}[] = [
  { label: "Water", last: "lastWateredAt", interval: "wateringIntervalDays" },
  { label: "Fertilize", last: "lastFertilizedAt", interval: "fertilizingIntervalDays" },
  { label: "Mist", last: "lastMistedAt", interval: "mistingIntervalDays" },
];

function formatNote(past: number | null): { text: string; accent: boolean } {
  if (past === null) return { text: "not tracked", accent: false };
  if (past >= 0) {
    const days = Math.max(1, Math.round(past));
    return { text: `${days} day${days === 1 ? "" : "s"} late`, accent: true };
  }
  const days = Math.max(1, Math.round(-past));
  return { text: `in ${days} day${days === 1 ? "" : "s"}`, accent: false };
}

export function CadenceRows({ plant, now = new Date() }: { plant: Plant; now?: Date }) {
  return (
    <div className="flex flex-col">
      {ROWS.map(({ label, last, interval }) => {
        const intervalDays = plant[interval];
        const lastDone = plant[last];
        const past = daysPastDue(lastDone, intervalDays, now);
        const note = formatNote(past);
        const proportion =
          intervalDays === null ? 0 : Math.min(1, Math.max(0, 1 + (past as number) / intervalDays));

        return (
          <div key={label} className="cadence-row">
            <span className="cadence-label">{label}</span>
            <span className="cadence-track">
              <span
                className="cadence-fill"
                style={{
                  width: `${proportion * 100}%`,
                  background: note.accent ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 40%, transparent)",
                }}
              />
            </span>
            <span
              className="cadence-note"
              style={{ color: note.accent ? "var(--color-accent)" : past === null ? "var(--text-tertiary)" : "var(--text-secondary)" }}
            >
              {note.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
