"use client";

import { Drop, Flask, CloudFog, Sparkle } from "@phosphor-icons/react";
import { ErrorBlock } from "./ErrorBlock";
import type { ScheduleFormValues } from "./EditScheduleSheet";
import type { CareTargets, TargetRange } from "@/lib/types/plant";

const ROWS: { key: keyof ScheduleFormValues; label: string; icon: typeof Drop }[] = [
  { key: "wateringIntervalDays", label: "Water", icon: Drop },
  { key: "fertilizingIntervalDays", label: "Fertilize", icon: Flask },
  { key: "mistingIntervalDays", label: "Mist", icon: CloudFog },
];

const TARGET_ROWS: { key: keyof CareTargets; label: string; unit: string }[] = [
  { key: "moisturePercent", label: "Moisture", unit: "%" },
  { key: "nutrientPercent", label: "Nutrients", unit: "%" },
  { key: "lightLux", label: "Light", unit: " lux" },
  { key: "ph", label: "pH", unit: "" },
  { key: "ecUsCm", label: "EC", unit: " µS/cm" },
];

function formatRange(range: TargetRange | null | undefined, unit: string): string {
  if (!range) return "Not set";
  if (range.min !== null && range.max !== null) return `${range.min}–${range.max}${unit}`;
  return range.min !== null ? `${range.min}${unit}+` : `up to ${range.max}${unit}`;
}

function formatInterval(days: number | null): string {
  return days === null ? "Off" : `every ${days} day${days === 1 ? "" : "s"}`;
}

export function RecommendedScheduleSheet({
  speciesLabel,
  current,
  suggested,
  currentTargets,
  suggestedTargets,
  loading,
  saving,
  error,
  onApply,
  onCancel,
}: {
  speciesLabel: string | null;
  current: ScheduleFormValues;
  suggested: ScheduleFormValues | null;
  currentTargets: CareTargets | null;
  suggestedTargets: CareTargets | null;
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
            {suggestedTargets && (
              <>
                <h3 className="kicker" style={{ margin: 0 }}>
                  Target readings
                </h3>
                {TARGET_ROWS.map(({ key, label, unit }) => (
                  <div key={key} className="flex items-center justify-between gap-[var(--space-3)]">
                    <span>{label}</span>
                    <span style={{ fontSize: 13 }}>
                      {formatRange(currentTargets?.[key], unit) !== formatRange(suggestedTargets[key], unit) && (
                        <span className="text-tertiary" style={{ textDecoration: "line-through", marginRight: 8 }}>
                          {formatRange(currentTargets?.[key], unit)}
                        </span>
                      )}
                      {formatRange(suggestedTargets[key], unit)}
                    </span>
                  </div>
                ))}
              </>
            )}
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
