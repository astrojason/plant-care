"use client";

import { Drop, Flask, CloudFog, Sparkle } from "@phosphor-icons/react";
import { ErrorBlock } from "./ErrorBlock";
import type { ScheduleFormValues } from "./EditScheduleSheet";

const ROWS: { key: keyof ScheduleFormValues; label: string; icon: typeof Drop }[] = [
  { key: "wateringIntervalDays", label: "Water", icon: Drop },
  { key: "fertilizingIntervalDays", label: "Fertilize", icon: Flask },
  { key: "mistingIntervalDays", label: "Mist", icon: CloudFog },
];

function formatInterval(days: number | null): string {
  return days === null ? "Off" : `every ${days} day${days === 1 ? "" : "s"}`;
}

export function RecommendedScheduleSheet({
  speciesLabel,
  current,
  suggested,
  loading,
  saving,
  error,
  onApply,
  onCancel,
}: {
  speciesLabel: string | null;
  current: ScheduleFormValues;
  suggested: ScheduleFormValues | null;
  loading: boolean;
  saving: boolean;
  error: unknown;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recommended care schedule"
        className="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">Recommended schedule</h2>
        {loading && (
          <div className="ai-loading-row">
            <Sparkle size={16} weight="fill" />
            Looking up care for {speciesLabel ?? "this plant"}…
          </div>
        )}
        {error !== null && <ErrorBlock error={error} title="Something went wrong" />}
        {suggested && (
          <div className="flex flex-col gap-[var(--space-3)]">
            {speciesLabel && (
              <p className="text-secondary" style={{ fontSize: 12, margin: 0 }}>
                Based on {speciesLabel}
              </p>
            )}
            {ROWS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between gap-[var(--space-3)]">
                <span className="flex items-center gap-[var(--space-2)]">
                  <Icon size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
                  {label}
                </span>
                <span style={{ fontSize: 13 }}>
                  {current[key] !== suggested[key] && (
                    <span className="text-tertiary" style={{ textDecoration: "line-through", marginRight: 8 }}>
                      {formatInterval(current[key])}
                    </span>
                  )}
                  {formatInterval(suggested[key])}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!suggested || saving} onClick={onApply}>
            {saving ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
