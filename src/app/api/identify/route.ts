import { NextResponse } from "next/server";
import { handleVisionRequest } from "@/lib/openai/visionRoute";
import { IdentificationResultSchema } from "@/lib/openai/schemas";
import {
  IDENTIFY_SYSTEM_PROMPT,
  IDENTIFY_USER_PROMPT,
  buildIdentifyUserPrompt,
  parseSoilTestContext,
} from "@/lib/openai/prompts";

export async function POST(request: Request) {
  // Optional: when refreshing an existing plant's care plan, the latest meter
  // reading is folded into the prompt. Clone so handleVisionRequest can still
  // read the body.
  let soilTest: unknown;
  try {
    soilTest = (await request.clone().json())?.soilTest;
  } catch {
    // Malformed JSON is handled uniformly inside handleVisionRequest.
  }
  const reading = parseSoilTestContext(soilTest);

  const { status, body } = await handleVisionRequest(request, {
    systemPrompt: IDENTIFY_SYSTEM_PROMPT,
    userPromptText: IDENTIFY_USER_PROMPT,
    buildUserPromptText: (speciesName) => buildIdentifyUserPrompt(speciesName, reading),
    schema: IdentificationResultSchema,
    schemaName: "plant_identification",
  });
  return NextResponse.json(body, { status });
}
