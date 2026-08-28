import { NextResponse } from "next/server";
import { handleVisionRequest } from "@/lib/openai/visionRoute";
import { DiagnosisResultSchema } from "@/lib/openai/schemas";
import { buildDiagnoseUserPrompt, DIAGNOSE_SYSTEM_PROMPT, type SoilTestContext } from "@/lib/openai/prompts";

function parseSoilTestContext(value: unknown): SoilTestContext | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const ph = typeof v.ph === "number" ? v.ph : null;
  const moistureLevel = typeof v.moistureLevel === "number" ? v.moistureLevel : null;
  const lightLevel = typeof v.lightLevel === "number" ? v.lightLevel : null;
  if (ph === null && moistureLevel === null && lightLevel === null) return null;
  return { ph, moistureLevel, lightLevel };
}

export async function POST(request: Request) {
  // Diagnosis always attaches to an existing plant (no standalone diagnosis
  // flow) — validate plantId up front, before the auth/token-gate/OpenAI
  // work in handleVisionRequest. Clone so the body stream is still readable
  // by handleVisionRequest afterward.
  let plantId: unknown;
  let soilTest: unknown;
  try {
    const body = await request.clone().json();
    plantId = body?.plantId;
    soilTest = body?.soilTest;
  } catch {
    // Malformed JSON is handled uniformly inside handleVisionRequest.
  }

  if (typeof plantId !== "string" || plantId.length === 0) {
    return NextResponse.json(
      { error: { message: "plantId is required and must be a string." } },
      { status: 400 }
    );
  }

  const { status, body } = await handleVisionRequest(request, {
    systemPrompt: DIAGNOSE_SYSTEM_PROMPT,
    userPromptText: buildDiagnoseUserPrompt(parseSoilTestContext(soilTest)),
    schema: DiagnosisResultSchema,
    schemaName: "plant_diagnosis",
  });
  return NextResponse.json(body, { status });
}
