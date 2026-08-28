import { describe, expect, it } from "vitest";
import { buildDiagnoseUserPrompt, DIAGNOSE_USER_PROMPT } from "./prompts";

describe("buildDiagnoseUserPrompt", () => {
  it("returns the base prompt when there is no soil test", () => {
    expect(buildDiagnoseUserPrompt(null)).toBe(DIAGNOSE_USER_PROMPT);
  });

  it("returns the base prompt when the soil test has no fields set", () => {
    expect(buildDiagnoseUserPrompt({ ph: null, moistureLevel: null, lightLevel: null })).toBe(
      DIAGNOSE_USER_PROMPT
    );
  });

  it("appends all three readings when present", () => {
    const prompt = buildDiagnoseUserPrompt({ ph: 6.5, moistureLevel: 7, lightLevel: 5 });

    expect(prompt).toBe(
      `${DIAGNOSE_USER_PROMPT} Most recent soil meter reading: pH 6.5, moisture 7/10, light 5/8.`
    );
  });

  it("appends only the readings that were provided", () => {
    const prompt = buildDiagnoseUserPrompt({ ph: 6.5, moistureLevel: null, lightLevel: null });

    expect(prompt).toBe(`${DIAGNOSE_USER_PROMPT} Most recent soil meter reading: pH 6.5.`);
  });
});
