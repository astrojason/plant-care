"use client";

import { useState } from "react";
import type { CareEvent } from "@/lib/types/plant";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorBlock } from "./ErrorBlock";

const EVENT_LABELS: Record<CareEvent["eventType"], string> = {
  watered: "Watered",
  fertilized: "Fertilized",
  misted: "Misted",
  other: "Other",
};

export function CareEventHistory({
  events,
  onDelete,
}: {
  events: CareEvent[];
  onDelete: (eventId: string) => Promise<void>;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setError(null);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err);
    }
  }

  if (events.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No care events logged yet.</p>;
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-gray-100">
        {events.map((event) => (
          <li key={event.id} className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {EVENT_LABELS[event.eventType]}
              </span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                {event.occurredAt.toLocaleString()}
              </span>
              {event.notes && <p className="text-xs text-gray-500 dark:text-gray-400">{event.notes}</p>}
            </div>
            <button
              type="button"
              aria-label={`Delete ${EVENT_LABELS[event.eventType].toLowerCase()} event`}
              onClick={() => setPendingDeleteId(event.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {error !== null && <ErrorBlock error={error} title="Failed to delete care event" />}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        destructive
        title="Delete this care event?"
        description="This removes the logged event and may adjust the plant's last-done date."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
