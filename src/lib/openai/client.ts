import "server-only";
import OpenAI from "openai";

export const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

const MOCK_FIXTURES: Record<string, unknown> = {
  plant_identification: {
    species_common_name: "Fiddle Leaf Fig",
    species_scientific_name: "Ficus lyrata",
    confidence: 0.92,
    care_summary: {
      light: "Bright, indirect light",
      water_frequency_guidance: "Water when the top 2 inches of soil are dry",
      humidity: "Moderate to high",
      notes: "E2E mock fixture — not a real identification.",
    },
    suggested_watering_interval_days: 7,
    suggested_fertilizing_interval_days: 30,
    suggested_misting_interval_days: 3,
  },
  plant_diagnosis: {
    overall_assessment: "E2E mock fixture — not a real diagnosis.",
    detected_issues: [
      {
        issue: "Overwatering",
        confidence: 0.7,
        symptoms_observed: ["Yellowing leaves"],
      },
    ],
    suggested_treatment: "Let the soil dry out between waterings.",
    urgency: "medium",
    treatment_steps: null,
    follow_up_days: null,
    schedule_adjustment: {
      care_type: "watering",
      suggested_interval_days: 10,
      reason: "E2E mock fixture — overwatering detected, so watering less often.",
    },
  },
};

interface MockParseParams {
  response_format?: { json_schema?: { name?: string } };
}

/**
 * E2E tests run against the Firebase emulators with OpenAI fully mocked —
 * no real API calls, no cost, no shared token-budget usage, deterministic
 * fixtures. Gated by an explicit env var so this path can never accidentally
 * activate outside test runs.
 */
function createMockClient(): OpenAI {
  return {
    chat: {
      completions: {
        parse: async (params: MockParseParams) => {
          const schemaName = params.response_format?.json_schema?.name ?? "";
          const parsed = MOCK_FIXTURES[schemaName];
          if (!parsed) {
            throw new Error(`No OPENAI_MOCK fixture registered for schema "${schemaName}"`);
          }
          return {
            choices: [{ message: { parsed } }],
            usage: { prompt_tokens: 80, completion_tokens: 20, total_tokens: 100 },
          };
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal mock surface, only .chat.completions.parse is ever called
    } as any,
  } as OpenAI;
}

let client: OpenAI | null = null;

/**
 * Lazily constructed — the SDK throws synchronously if OPENAI_API_KEY is
 * missing, so this must not run at module import time (would break `next
 * build` / route bundling before the user has configured .env.local).
 */
export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = process.env.OPENAI_MOCK === "true" ? createMockClient() : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
