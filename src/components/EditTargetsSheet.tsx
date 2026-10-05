"use client";

import { useState } from "react";
import type { CareTargets, TargetRange } from "@/lib/types/plant";

type Metric = keyof CareTargets;

const ROWS: { key: Metric; label: string; maxOnly?: boolean }[] = [
  { key: "moisturePercent", label: "Moisture (%)" },
  { key: "nutrientPercent", label: "Nutrients (%)" },
  { key: "lightLux", label: "Light (lux)" },
  { key: "ph", label: "pH" },
  { key: "ecUsCm", label: "EC (µS/cm)", maxOnly: true },
];

type Draft = Record<Metric, { min: string; max: string }>;

function toDraft(targets: CareTargets | null): Draft {
  const entry = (r: TargetRange | null | undefined) => ({ min: r?.min?.toString() ?? "", max: r?.max?.toString() ?? "" });
  return {
    moisturePercent: entry(targets?.moisturePercent),
    nutrientPercent: entry(targets?.nutrientPercent),
    lightLux: entry(targets?.lightLux),
    ph: entry(targets?.ph),
    ecUsCm: entry(targets?.ecUsCm),
  };
}

function toRange(d: { min: string; max: string }): TargetRange | null {
  const min = d.min === "" ? null : Number(d.min);
  const max = d.max === "" ? null : Number(d.max);
  return min === null && max === null ? null : { min, max };
}

/** Edits the ranges a plant's meter readings are judged against. Blank = no limit. */
export function EditTargetsSheet({
  initial,
  onSave,
  onCancel,
}: {
  initial: CareTargets | null;
  onSave: (targets: CareTargets) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));

  function update(key: Metric, bound: "min" | "max", value: string) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], [bound]: value } }));
  }

  function save() {
    onSave({
      moisturePercent: toRange(draft.moisturePercent),
      nutrientPercent: toRange(draft.nutrientPercent),
      lightLux: toRange(draft.lightLux),
      ph: toRange(draft.ph),
      ecUsCm: toRange(draft.ecUsCm),
    });
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Edit targets" className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Edit targets</h2>
        <p className="text-secondary" style={{ fontSize: 12, margin: 0 }}>
          Readings outside these ranges raise alerts and override the care schedule. Leave a bound blank for no limit.
        </p>
        <div className="flex flex-col gap-[var(--space-3)]">
          {ROWS.map(({ key, label, maxOnly }) => (
            <div key={key} className="field">
              <label htmlFor={`target-${key}-${maxOnly ? "max" : "min"}`}>{label}</label>
              <div className="flex gap-[var(--space-2)]">
                {!maxOnly && (
                  <input
                    id={`target-${key}-min`}
                    aria-label={`${label} min`}
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="Min"
                    value={draft[key].min}
                    onChange={(e) => update(key, "min", e.target.value)}
                  />
                )}
                <input
                  id={`target-${key}-max`}
                  aria-label={`${label} max`}
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Max"
                  value={draft[key].max}
                  onChange={(e) => update(key, "max", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
