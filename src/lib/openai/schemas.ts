import { z } from "zod";

export const IdentificationResultSchema = z.object({
  species_common_name: z.string(),
  species_scientific_name: z.string(),
  confidence: z.number().min(0).max(1),
  care_summary: z.object({
    light: z.string(),
    water_frequency_guidance: z.string(),
    humidity: z.string(),
    notes: z.string(),
  }),
  suggested_watering_interval_days: z.number().int().positive(),
  suggested_fertilizing_interval_days: z.number().int().positive(),
  suggested_misting_interval_days: z.number().int().positive(),
  suggested_targets: z.object({
    moisture_min_percent: z.number().nullable(),
    moisture_max_percent: z.number().nullable(),
    nutrient_min_percent: z.number().nullable(),
    nutrient_max_percent: z.number().nullable(),
    light_min_lux: z.number().nullable(),
    light_max_lux: z.number().nullable(),
    ph_min: z.number().nullable(),
    ph_max: z.number().nullable(),
    ec_max_us_cm: z.number().nullable(),
  }),
});
export type IdentificationResult = z.infer<typeof IdentificationResultSchema>;

export const DiagnosisResultSchema = z.object({
  overall_assessment: z.string(),
  detected_issues: z.array(
    z.object({
      issue: z.string(),
      confidence: z.number().min(0).max(1),
      symptoms_observed: z.array(z.string()),
    })
  ),
  suggested_treatment: z.string(),
  urgency: z.enum(["low", "medium", "high"]),
  treatment_steps: z.array(z.object({ action: z.string(), timing: z.string() })).nullable(),
  follow_up_days: z.number().int().positive().nullable(),
  schedule_adjustment: z
    .object({
      care_type: z.enum(["watering", "fertilizing", "misting"]),
      suggested_interval_days: z.number().int().positive(),
      reason: z.string(),
    })
    .nullable(),
});
export type DiagnosisResult = z.infer<typeof DiagnosisResultSchema>;
