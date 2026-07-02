"use client";

import { useState } from "react";
import { ErrorBlock } from "./ErrorBlock";

type LoggableEventType = "watered" | "fertilized" | "misted";

const EVENT_LABELS: Record<LoggableEventType, string> = {
  watered: "Water",
  fertilized: "Fertilize",
  misted: "Mist",
};

export function CareEventButtons({
  onLog,
}: {
  onLog: (eventType: LoggableEventType) => Promise<void>;
}) {
  const [pending, setPending] = useState<LoggableEventType | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function handleClick(eventType: LoggableEventType) {
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
    <div className="space-y-3">
      <div className="flex gap-2">
        {(Object.keys(EVENT_LABELS) as LoggableEventType[]).map((type) => (
          <button
            key={type}
            type="button"
            disabled={pending !== null}
            onClick={() => handleClick(type)}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {pending === type ? "Logging…" : EVENT_LABELS[type]}
          </button>
        ))}
      </div>
      {error !== null && <ErrorBlock error={error} title="Failed to log care event" />}
    </div>
  );
}
