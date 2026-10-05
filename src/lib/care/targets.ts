import type { IdentificationResult } from "../openai/schemas";
import type { CareTargets, TargetRange } from "../types/plant";

function range(min: number | null, max: number | null): TargetRange | null {
  return min === null && max === null ? null : { min, max };
}

/** Converts the AI's flat `suggested_targets` into the per-metric ranges stored on a plant. */
export function targetsFromSuggestion(s: IdentificationResult["suggested_targets"]): CareTargets {
  return {
    moisturePercent: range(s.moisture_min_percent, s.moisture_max_percent),
    nutrientPercent: range(s.nutrient_min_percent, s.nutrient_max_percent),
    lightLux: range(s.light_min_lux, s.light_max_lux),
    ph: range(s.ph_min, s.ph_max),
    ecUsCm: range(null, s.ec_max_us_cm),
  };
}
