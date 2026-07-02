import { NextResponse } from "next/server";
import { handleVisionRequest } from "@/lib/openai/visionRoute";
import { DiagnosisResultSchema } from "@/lib/openai/schemas";
import { DIAGNOSE_SYSTEM_PROMPT, DIAGNOSE_USER_PROMPT } from "@/lib/openai/prompts";

export async function POST(request: Request) {
  // Diagnosis always attaches to an existing plant (no standalone diagnosis
  // flow) — validate plantId up front, before the auth/token-gate/OpenAI
  // work in handleVisionRequest. Clone so the body stream is still readable
  // by handleVisionRequest afterward.
  let plantId: unknown;
  try {
    const body = await request.clone().json();
    plantId = body?.plantId;
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
    userPromptText: DIAGNOSE_USER_PROMPT,
    schema: DiagnosisResultSchema,
    schemaName: "plant_diagnosis",
  });
  return NextResponse.json(body, { status });
}
