import { describe, expect, it } from "vitest";
import { DiagnosisResultSchema, IdentificationResultSchema } from "./schemas";

describe("IdentificationResultSchema", () => {
  const valid = {
    species_common_name: "Fiddle Leaf Fig",
    species_scientific_name: "Ficus lyrata",
    confidence: 0.87,
    care_summary: {
      light: "Bright, indirect light",
      water_frequency_guidance: "Water when top 2 inches of soil are dry",
      humidity: "Moderate to high",
      notes: "Sensitive to being moved.",
    },
    suggested_watering_interval_days: 7,
    suggested_fertilizing_interval_days: 30,
    suggested_misting_interval_days: 3,
  };

  it("accepts a well-formed identification result", () => {
    expect(IdentificationResultSchema.parse(valid)).toEqual(valid);
  });

  it("rejects confidence outside the 0-1 range", () => {
    expect(() =>
      IdentificationResultSchema.parse({ ...valid, confidence: 1.5 })
    ).toThrow();
  });

  it("rejects a non-positive interval", () => {
    expect(() =>
      IdentificationResultSchema.parse({ ...valid, suggested_watering_interval_days: 0 })
    ).toThrow();
  });

  it("rejects a missing required field", () => {
    const missing: Partial<typeof valid> = { ...valid };
    delete missing.species_scientific_name;
    expect(() => IdentificationResultSchema.parse(missing)).toThrow();
  });
});

describe("DiagnosisResultSchema", () => {
  const valid = {
    overall_assessment: "Leaves show signs of overwatering.",
    detected_issues: [
      {
        issue: "Overwatering",
        confidence: 0.7,
        symptoms_observed: ["Yellowing leaves", "Soft stems"],
      },
    ],
    suggested_treatment: "Reduce watering frequency and check for root rot.",
    urgency: "medium" as const,
    treatment_steps: null,
    follow_up_days: null,
    schedule_adjustment: null,
  };

  it("accepts a well-formed diagnosis result", () => {
    expect(DiagnosisResultSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an invalid urgency value", () => {
    expect(() =>
      DiagnosisResultSchema.parse({ ...valid, urgency: "extreme" })
    ).toThrow();
  });

  it("accepts an empty detected_issues array (e.g. plant looks healthy)", () => {
    expect(
      DiagnosisResultSchema.parse({ ...valid, detected_issues: [] })
    ).toEqual({ ...valid, detected_issues: [] });
  });

  it("rejects a detected issue missing symptoms_observed", () => {
    expect(() =>
      DiagnosisResultSchema.parse({
        ...valid,
        detected_issues: [{ issue: "Overwatering", confidence: 0.7 }],
      })
    ).toThrow();
  });

  it("accepts a schedule_adjustment suggesting a new watering interval", () => {
    const withAdjustment = {
      ...valid,
      schedule_adjustment: { care_type: "watering" as const, suggested_interval_days: 10, reason: "Overwatered." },
    };
    expect(DiagnosisResultSchema.parse(withAdjustment)).toEqual(withAdjustment);
  });

  it("rejects a schedule_adjustment with a non-positive interval", () => {
    expect(() =>
      DiagnosisResultSchema.parse({
        ...valid,
        schedule_adjustment: { care_type: "watering", suggested_interval_days: 0, reason: "Overwatered." },
      })
    ).toThrow();
  });
});
