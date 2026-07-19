import "server-only";
import type { ZodType } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { requireAuthorized } from "@/lib/auth/requireRole";
import { checkTokenGate, reportTokens, DAILY_TOKEN_LIMIT } from "@/lib/tokenTracker";
import { getOpenAIClient, VISION_MODEL } from "./client";

export interface VisionRequestConfig<T> {
  systemPrompt: string;
  userPromptText: string;
  schema: ZodType<T>;
  schemaName: string;
}

export interface VisionRouteResult {
  status: number;
  body: Record<string, unknown>;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Shared logic behind /api/identify and /api/diagnose: verify the caller's
 * Firebase ID token and role (PENDING accounts are rejected), gate on the
 * shared daily token budget, call OpenAI with a structured-output schema,
 * and report tokens used. Every failure path returns the full underlying
 * error message — nothing here fails silently, per the app's error-surfacing
 * convention (rendered via ErrorBlock client-side).
 */
export async function handleVisionRequest<T>(
  request: Request,
  config: VisionRequestConfig<T>
): Promise<VisionRouteResult> {
  const authResult = await requireAuthorized(request);
  if ("status" in authResult) {
    return authResult;
  }

  let payload: { photoUrl?: unknown; confirmNearLimit?: unknown };
  try {
    payload = await request.json();
  } catch (err) {
    return { status: 400, body: { error: { message: `Invalid JSON body: ${errMessage(err)}` } } };
  }

  if (typeof payload.photoUrl !== "string" || payload.photoUrl.length === 0) {
    return { status: 400, body: { error: { message: "photoUrl is required and must be a non-empty string." } } };
  }
  const photoUrl = payload.photoUrl;
  const confirmNearLimit = payload.confirmNearLimit === true;

  const gate = await checkTokenGate(confirmNearLimit);
  if (!gate.allowed) {
    if (gate.reason === "limit_reached") {
      return {
        status: 429,
        body: {
          error: {
            message: `Daily AI token limit reached (${gate.tokensUsed.toLocaleString()} / ${DAILY_TOKEN_LIMIT.toLocaleString()} tokens used today, across all apps sharing this budget).`,
          },
        },
      };
    }
    return {
      status: 200,
      body: { requiresConfirmation: true, tokensUsed: gate.tokensUsed, dailyLimit: DAILY_TOKEN_LIMIT },
    };
  }

  try {
    const completion = await getOpenAIClient().chat.completions.parse({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: config.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: config.userPromptText },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        },
      ],
      response_format: zodResponseFormat(config.schema, config.schemaName),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error(
        "OpenAI did not return a parsed structured result (the model may have refused the request)."
      );
    }

    if (completion.usage) {
      await reportTokens(completion.usage.total_tokens);
    }

    return { status: 200, body: { result: parsed } };
  } catch (err) {
    return {
      status: 502,
      body: {
        error: {
          message: `OpenAI request failed: ${errMessage(err)}`,
          details: err instanceof Error ? err.stack : undefined,
        },
      },
    };
  }
}
