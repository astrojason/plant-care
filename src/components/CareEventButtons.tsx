"use client";

import { useState } from "react";
import { Drop, Flask, CloudFog } from "@phosphor-icons/react";
import type { Plant } from "@/lib/types/plant";
import { daysPastDue, type LoggableCareType } from "@/lib/care/schedule";
import { ErrorBlock } from "./ErrorBlock";

const CARE_TYPES: {
  type: LoggableCareType;
  label: string;
  icon: typeof Drop;
  last: "lastWateredAt" | "lastFertilizedAt" | "lastMistedAt";
  interval: "wateringIntervalDays" | "fertilizingIntervalDays" | "mistingIntervalDays";
}[] = [
  { type: "watered", label: "Water", icon: Drop, last: "lastWateredAt", interval: "wateringIntervalDays" },
  { type: "fertilized", label: "Fertilize", icon: Flask, last: "lastFertilizedAt", interval: "fertilizingIntervalDays" },
  { type: "misted", label: "Mist", icon: CloudFog, last: "lastMistedAt", interval: "mistingIntervalDays" },
];

/**
 * The plant-detail action row. Emphasis (accent outline + tint) goes to
 * whichever tracked care type is most overdue (or, if none are overdue,
 * soonest due) — re-derived from `plant` on every render, so logging an
 * event and re-sorting emphasis happen for free via the Firestore listener.
 */
export function CareEventButtons({
  plant,
  now = new Date(),
  onLog,
}: {
  plant: Plant;
  now?: Date;
  onLog: (eventType: LoggableCareType) => Promise<void>;
}) {
  const [pending, setPending] = useState<LoggableCareType | null>(null);
  const [error, setError] = useState<unknown>(null);

  const scored = CARE_TYPES.map((c) => ({
    ...c,
    score: daysPastDue(plant[c.last], plant[c.interval], now),
  }));
  const tracked = scored.filter((c): c is typeof c & { score: number } => c.score !== null);
  const emphasizedType =
    tracked.length > 0 ? tracked.reduce((a, b) => (b.score > a.score ? b : a)).type : null;

  async function handleClick(eventType: LoggableCareType) {
    setError(null);
    setPending(eventType);
    try {
      await onLog(eventType);
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <div className="action-row">
        {scored.map(({ type, label, icon: Icon }) => {
          const emphasized = type === emphasizedType;
          return (
            <button
              key={type}
              type="button"
              disabled={pending !== null}
              onClick={() => handleClick(type)}
              className={`btn action-btn ${emphasized ? "btn-primary" : "btn-secondary"}`}
              style={{
                background: emphasized ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : undefined,
              }}
            >
              <Icon size={20} weight={emphasized ? "fill" : "regular"} />
              <span>{pending === type ? "Logging…" : label}</span>
            </button>
          );
        })}
      </div>
      {error !== null && <ErrorBlock error={error} title="Failed to log care event" />}
    </div>
  );
}
