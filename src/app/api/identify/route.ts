import { NextResponse } from "next/server";
import { handleVisionRequest } from "@/lib/openai/visionRoute";
import { IdentificationResultSchema } from "@/lib/openai/schemas";
import { IDENTIFY_SYSTEM_PROMPT, IDENTIFY_USER_PROMPT } from "@/lib/openai/prompts";

export async function POST(request: Request) {
  const { status, body } = await handleVisionRequest(request, {
    systemPrompt: IDENTIFY_SYSTEM_PROMPT,
    userPromptText: IDENTIFY_USER_PROMPT,
    schema: IdentificationResultSchema,
    schemaName: "plant_identification",
  });
  return NextResponse.json(body, { status });
}
