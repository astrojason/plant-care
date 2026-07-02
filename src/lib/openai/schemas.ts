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
});
export type DiagnosisResult = z.infer<typeof DiagnosisResultSchema>;
