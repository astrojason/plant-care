import { describe, expect, it } from "vitest";
import {
  buildDiagnoseUserPrompt,
  buildIdentifyUserPrompt,
  DIAGNOSE_USER_PROMPT,
  IDENTIFY_USER_PROMPT,
} from "./prompts";

describe("buildDiagnoseUserPrompt", () => {
  it("returns the base prompt when there is no soil test", () => {
    expect(buildDiagnoseUserPrompt(null)).toBe(DIAGNOSE_USER_PROMPT);
  });

  it("returns the base prompt when the soil test has no fields set", () => {
    expect(buildDiagnoseUserPrompt({ ph: null, moisturePercent: null, lightLux: null, nutrientPercent: null, ecUsCm: null, tdsPpm: null })).toBe(
      DIAGNOSE_USER_PROMPT
    );
  });

  it("appends all readings when present", () => {
    const prompt = buildDiagnoseUserPrompt({
      ph: 6.5,
      moisturePercent: 40,
      nutrientPercent: 30,
      lightLux: 5000,
      ecUsCm: 800,
      tdsPpm: 400,
    });

    expect(prompt).toBe(
      `${DIAGNOSE_USER_PROMPT} Most recent soil meter reading: pH 6.5, soil moisture 40%, soil nutrients 30%, light 5000 lux, water EC 800 µS/cm, water TDS 400 ppm.`
    );
  });

  it("appends only the readings that were provided", () => {
    const prompt = buildDiagnoseUserPrompt({ ph: 6.5, moisturePercent: null, lightLux: null, nutrientPercent: null, ecUsCm: null, tdsPpm: null });

    expect(prompt).toBe(`${DIAGNOSE_USER_PROMPT} Most recent soil meter reading: pH 6.5.`);
  });
});

describe("buildIdentifyUserPrompt with a soil test", () => {
  it("folds the latest reading into the plan-refresh prompt", () => {
    const prompt = buildIdentifyUserPrompt("Ficus lyrata", {
      ph: null,
      moisturePercent: 12,
      nutrientPercent: null,
      lightLux: 900,
      ecUsCm: null,
      tdsPpm: null,
    });

    expect(prompt).toContain('"Ficus lyrata"');
    expect(prompt).toContain("Most recent soil meter reading: soil moisture 12%, light 900 lux.");
  });

  it("is unchanged when the reading has no fields", () => {
    const empty = { ph: null, moisturePercent: null, nutrientPercent: null, lightLux: null, ecUsCm: null, tdsPpm: null };
    expect(buildIdentifyUserPrompt(null, empty)).toBe(buildIdentifyUserPrompt(null));
  });
});

describe("buildIdentifyUserPrompt", () => {
  it("returns the base prompt when there is no species name", () => {
    expect(buildIdentifyUserPrompt()).toBe(IDENTIFY_USER_PROMPT);
    expect(buildIdentifyUserPrompt("   ")).toBe(IDENTIFY_USER_PROMPT);
  });

  it("tells the model to treat the user's species name as correct", () => {
    expect(buildIdentifyUserPrompt(" Snake plant ")).toContain('"Snake plant"');
  });
});
