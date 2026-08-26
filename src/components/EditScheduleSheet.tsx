"use client";

import { useState } from "react";
import { Drop, Flask, CloudFog } from "@phosphor-icons/react";
import { Stepper } from "./Stepper";

export interface ScheduleFormValues {
  wateringIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  mistingIntervalDays: number | null;
}

const ROWS: { key: keyof ScheduleFormValues; label: string; icon: typeof Drop }[] = [
  { key: "wateringIntervalDays", label: "Water", icon: Drop },
  { key: "fertilizingIntervalDays", label: "Fertilize", icon: Flask },
  { key: "mistingIntervalDays", label: "Mist", icon: CloudFog },
];

export function EditScheduleSheet({
  initial,
  onSave,
  onCancel,
}: {
  initial: ScheduleFormValues;
  onSave: (values: ScheduleFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Edit care schedule" className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Edit care schedule</h2>
        <div className="flex flex-col gap-[var(--space-3)]">
          {ROWS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-[var(--space-3)]">
              <span className="flex items-center gap-[var(--space-2)]">
                <Icon size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
                {label}
              </span>
              <Stepper
                label={label}
                value={values[key]}
                onChange={(v) => setValues((f) => ({ ...f, [key]: v }))}
              />
            </div>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(values)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
