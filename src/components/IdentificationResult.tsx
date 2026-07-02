"use client";

import { useState } from "react";
import type { IdentificationResult } from "@/lib/openai/schemas";

export interface IdentificationFormValues {
  nickname: string;
  speciesCommonName: string;
  speciesScientificName: string;
  wateringIntervalDays: number;
  fertilizingIntervalDays: number;
  mistingIntervalDays: number;
}

const LOW_CONFIDENCE_THRESHOLD = 0.5;

/**
 * AI output is always an editable suggestion, never a locked value — this
 * view always renders a save-able form, even at very low confidence, with a
 * warning banner rather than a hard block.
 */
export function IdentificationResultView({
  result,
  onConfirm,
}: {
  result: IdentificationResult;
  onConfirm: (values: IdentificationFormValues) => void;
}) {
  const [values, setValues] = useState<IdentificationFormValues>({
    nickname: result.species_common_name || "My Plant",
    speciesCommonName: result.species_common_name,
    speciesScientificName: result.species_scientific_name,
    wateringIntervalDays: result.suggested_watering_interval_days,
    fertilizingIntervalDays: result.suggested_fertilizing_interval_days,
    mistingIntervalDays: result.suggested_misting_interval_days,
  });

  const isLowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD;

  function update<K extends keyof IdentificationFormValues>(
    key: K,
    value: IdentificationFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <div className="space-y-4">
      {isLowConfidence && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Low-confidence identification ({Math.round(result.confidence * 100)}%). Double-check
          the details below, or retake the photo.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="id-nickname">
          Nickname
        </label>
        <input
          id="id-nickname"
          value={values.nickname}
          onChange={(e) => update("nickname", e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="id-common-name">
          Common name
        </label>
        <input
          id="id-common-name"
          value={values.speciesCommonName}
          onChange={(e) => update("speciesCommonName", e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="id-scientific-name">
          Scientific name
        </label>
        <input
          id="id-scientific-name"
          value={values.speciesScientificName}
          onChange={(e) => update("speciesScientificName", e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="id-watering">
            Water (days)
          </label>
          <input
            id="id-watering"
            type="number"
            value={values.wateringIntervalDays}
            onChange={(e) => update("wateringIntervalDays", Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="id-fertilizing">
            Fertilize (days)
          </label>
          <input
            id="id-fertilizing"
            type="number"
            value={values.fertilizingIntervalDays}
            onChange={(e) => update("fertilizingIntervalDays", Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="id-misting">
            Mist (days)
          </label>
          <input
            id="id-misting"
            type="number"
            value={values.mistingIntervalDays}
            onChange={(e) => update("mistingIntervalDays", Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onConfirm(values)}
        className="rounded-md bg-green-700 px-4 py-2 text-white hover:bg-green-800"
      >
        Save plant
      </button>
    </div>
  );
}
