"use client";

import { useState } from "react";

export interface SpeciesFormValues {
  nickname: string;
  speciesCommonName: string;
  speciesScientificName: string;
  location: string;
}

export function EditSpeciesSheet({
  initial,
  locations,
  onSave,
  onCancel,
}: {
  initial: SpeciesFormValues;
  locations: string[];
  onSave: (values: SpeciesFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);

  function update<K extends keyof SpeciesFormValues>(key: K, value: SpeciesFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Edit species" className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Edit species</h2>
        <div className="flex flex-col gap-[var(--space-3)]">
          <div className="field">
            <label htmlFor="species-nickname">Nickname</label>
            <input
              id="species-nickname"
              className="input"
              value={values.nickname}
              onChange={(e) => update("nickname", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="species-common-name">Common name</label>
            <input
              id="species-common-name"
              className="input"
              value={values.speciesCommonName}
              onChange={(e) => update("speciesCommonName", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="species-scientific-name">Scientific name</label>
            <input
              id="species-scientific-name"
              className="input"
              value={values.speciesScientificName}
              onChange={(e) => update("speciesScientificName", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="species-location">Location</label>
            <select
              id="species-location"
              className="input"
              value={values.location}
              onChange={(e) => update("location", e.target.value)}
            >
              <option value="">No location</option>
              {Array.from(new Set([...locations, ...(values.location ? [values.location] : [])])).map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
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
