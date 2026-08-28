"use client";

import { useState } from "react";
import { Drop, Sun } from "@phosphor-icons/react";
import { Stepper } from "./Stepper";

export interface SoilTestFormValues {
  ph: number | null;
  moistureLevel: number | null;
  lightLevel: number | null;
  notes: string;
}

const EMPTY_VALUES: SoilTestFormValues = { ph: null, moistureLevel: null, lightLevel: null, notes: "" };

/** Logs a reading from a handheld 3-in-1 soil meter (pH probe, moisture and
 * light dials). All fields are optional — a meter reading is whatever the
 * user happened to check. */
export function LogSoilTestSheet({
  onSave,
  onCancel,
}: {
  onSave: (values: SoilTestFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<SoilTestFormValues>(EMPTY_VALUES);

  function update<K extends keyof SoilTestFormValues>(key: K, value: SoilTestFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Log soil test" className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Log soil test</h2>
        <div className="flex flex-col gap-[var(--space-3)]">
          <div className="field">
            <label htmlFor="soil-test-ph">pH</label>
            <input
              id="soil-test-ph"
              className="input"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={14}
              placeholder="e.g. 6.5"
              value={values.ph ?? ""}
              onChange={(e) => update("ph", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <span className="flex items-center gap-[var(--space-2)]">
              <Drop size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
              Moisture
            </span>
            <Stepper
              label="moisture"
              value={values.moistureLevel}
              onChange={(v) => update("moistureLevel", v)}
              min={1}
              max={10}
            />
          </div>
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <span className="flex items-center gap-[var(--space-2)]">
              <Sun size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
              Light
            </span>
            <Stepper
              label="light"
              value={values.lightLevel}
              onChange={(v) => update("lightLevel", v)}
              min={1}
              max={8}
            />
          </div>
          <div className="field">
            <label htmlFor="soil-test-notes">Notes</label>
            <textarea
              id="soil-test-notes"
              className="input"
              value={values.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
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
