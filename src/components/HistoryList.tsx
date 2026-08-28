"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Drop, Flask, CloudFog, FirstAidKit, Gauge, Leaf, Trash } from "@phosphor-icons/react";
import type { CareEventType } from "@/lib/types/plant";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorBlock } from "./ErrorBlock";

export interface HistoryEntry {
  id: string;
  kind: "care" | "diagnosis" | "soilTest";
  careEventType?: CareEventType;
  label: string;
  date: Date;
}

const DELETABLE_KINDS: HistoryEntry["kind"][] = ["care", "soilTest"];

const CARE_ICONS: Record<CareEventType, typeof Drop> = {
  watered: Drop,
  fertilized: Flask,
  misted: CloudFog,
  other: Leaf,
};

const SWIPE_OPEN_X = -72;
const SWIPE_THRESHOLD = -36;

function HistoryRow({
  entry,
  odd,
  onRequestDelete,
}: {
  entry: HistoryEntry;
  odd: boolean;
  onRequestDelete: (id: string) => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const dragRef = useRef<{ startX: number; base: number } | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!DELETABLE_KINDS.includes(entry.kind)) return;
    dragRef.current = { startX: e.clientX, base: swipeX };
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    setSwipeX(Math.min(0, Math.max(SWIPE_OPEN_X, dragRef.current.base + delta)));
  }
  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setSwipeX((x) => (x < SWIPE_THRESHOLD ? SWIPE_OPEN_X : 0));
  }

  const Icon =
    entry.kind === "diagnosis"
      ? FirstAidKit
      : entry.kind === "soilTest"
        ? Gauge
        : CARE_ICONS[entry.careEventType ?? "other"];

  return (
    <div className={`relative overflow-hidden row-rule${odd ? " zebra-odd" : ""}`}>
      {DELETABLE_KINDS.includes(entry.kind) && (
        <button
          type="button"
          aria-label={entry.kind === "soilTest" ? "Delete soil test" : `Delete ${entry.label.toLowerCase()} event`}
          onClick={() => onRequestDelete(entry.id)}
          className="history-row-delete"
        >
          <Trash size={16} weight="regular" />
        </button>
      )}
      <div
        className="history-row"
        style={{ "--swipe-x": `${swipeX}px` } as React.CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <Icon
          size={16}
          weight="regular"
          style={{
            color:
              entry.kind === "diagnosis"
                ? "var(--color-accent)"
                : "color-mix(in srgb, var(--color-text) 50%, transparent)",
          }}
        />
        <span className="flex-1 text-sm">{entry.label}</span>
        <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
          {entry.date.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

/** Care events and diagnoses, interleaved newest-first. Two rows visible by
 * default, the rest behind "Show all". Care rows swipe left to reveal
 * delete; diagnosis rows aren't deletable. */
export function HistoryList({
  entries,
  onDelete,
}: {
  entries: HistoryEntry[];
  onDelete: (entry: HistoryEntry) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  if (entries.length === 0) {
    return <p className="text-sm text-secondary">No history yet.</p>;
  }

  const visible = expanded ? entries : entries.slice(0, 2);
  const pendingDeleteEntry = entries.find((e) => e.id === pendingDeleteId) ?? null;

  async function confirmDelete() {
    if (!pendingDeleteEntry) return;
    setPendingDeleteId(null);
    setError(null);
    try {
      await onDelete(pendingDeleteEntry);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="flex flex-col">
      {visible.map((entry, i) => (
        <HistoryRow key={entry.id} entry={entry} odd={i % 2 === 1} onRequestDelete={setPendingDeleteId} />
      ))}
      {!expanded && entries.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="btn btn-ghost self-start mt-[var(--space-2)]"
        >
          Show all
        </button>
      )}
      {error !== null && <ErrorBlock error={error} title="Failed to delete history entry" />}
      <ConfirmDialog
        open={pendingDeleteEntry !== null}
        title={pendingDeleteEntry?.kind === "soilTest" ? "Delete this soil test?" : "Delete this care event?"}
        description="This removes the logged entry and may adjust the plant's last-done date."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
