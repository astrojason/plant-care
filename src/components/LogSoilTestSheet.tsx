"use client";

import { useState } from "react";

export interface SoilTestFormValues {
  ph: number | null;
  moisturePercent: number | null;
  nutrientPercent: number | null;
  lightLux: number | null;
  ecUsCm: number | null;
  tdsPpm: number | null;
  notes: string;
}

type NumericKey = Exclude<keyof SoilTestFormValues, "notes">;

const EMPTY_VALUES: SoilTestFormValues = {
  ph: null,
  moisturePercent: null,
  nutrientPercent: null,
  lightLux: null,
  ecUsCm: null,
  tdsPpm: null,
  notes: "",
};

const GROUPS: { title: string; fields: { key: NumericKey; label: string; step: number; max?: number; placeholder: string }[] }[] = [
  {
    title: "Soil",
    fields: [
      { key: "ph", label: "pH", step: 0.1, max: 14, placeholder: "e.g. 6.5" },
      { key: "moisturePercent", label: "Moisture (%)", step: 1, max: 100, placeholder: "e.g. 40" },
      { key: "nutrientPercent", label: "Nutrients (%)", step: 1, max: 100, placeholder: "e.g. 30" },
    ],
  },
  {
    title: "Light",
    fields: [{ key: "lightLux", label: "Light (lux)", step: 1, placeholder: "e.g. 5000" }],
  },
  {
    title: "Water",
    fields: [
      { key: "ecUsCm", label: "EC (µS/cm)", step: 1, placeholder: "e.g. 800" },
      { key: "tdsPpm", label: "TDS (ppm)", step: 1, placeholder: "e.g. 400" },
    ],
  },
];

/** Logs a reading from a handheld 7-in-1 soil meter. All fields are optional
 * — a meter reading is whatever the user happened to check. */
export function LogSoilTestSheet({
  onSave,
  onCancel,
}: {
  onSave: (values: SoilTestFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<SoilTestFormValues>(EMPTY_VALUES);

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Log soil test" className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Log soil test</h2>
        <div className="flex flex-col gap-[var(--space-3)]">
          {GROUPS.map((group) => (
            <fieldset key={group.title} className="flex flex-col gap-[var(--space-3)]">
              <legend className="label">{group.title}</legend>
              {group.fields.map((f) => (
                <div key={f.key} className="field">
                  <label htmlFor={`soil-test-${f.key}`}>{f.label}</label>
                  <input
                    id={`soil-test-${f.key}`}
                    className="input"
                    type="number"
                    inputMode="decimal"
                    step={f.step}
                    min={0}
                    max={f.max}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value === "" ? null : Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </fieldset>
          ))}
          <div className="field">
            <label htmlFor="soil-test-notes">Notes</label>
            <textarea
              id="soil-test-notes"
              className="input"
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
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
