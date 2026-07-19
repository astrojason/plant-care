import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mockVerifyIdToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
}));

const mockCheckTokenGate = vi.fn();
const mockReportTokens = vi.fn();
vi.mock("@/lib/tokenTracker", () => ({
  checkTokenGate: (...args: unknown[]) => mockCheckTokenGate(...args),
  reportTokens: (...args: unknown[]) => mockReportTokens(...args),
  DAILY_TOKEN_LIMIT: 250000,
}));

const mockParse = vi.fn();
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({ chat: { completions: { parse: (...args: unknown[]) => mockParse(...args) } } }),
  VISION_MODEL: "gpt-4o-mini",
}));

const { handleVisionRequest } = await import("./visionRoute");

const TestSchema = z.object({ ok: z.boolean() });

function makeRequest(body: unknown, headers: Record<string, string> = { authorization: "Bearer valid-token" }) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockVerifyIdToken.mockReset();
  mockCheckTokenGate.mockReset();
  mockReportTokens.mockReset();
  mockParse.mockReset();
  mockVerifyIdToken.mockResolvedValue({ uid: "user-1", role: "USER" });
  mockCheckTokenGate.mockResolvedValue({ allowed: true });
});

const config = {
  systemPrompt: "system prompt",
  userPromptText: "user prompt",
  schema: TestSchema,
  schemaName: "test_schema",
};

describe("handleVisionRequest", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }, {}), config);

    expect(result.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 with the full error message when token verification fails", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Firebase ID token has expired"));

    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }), config);

    expect(result.status).toBe(401);
    expect(JSON.stringify(result.body)).toMatch(/Firebase ID token has expired/);
  });

  it("returns 403 without calling OpenAI when the caller has no authorized role (PENDING)", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "user-1" });

    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }), config);

    expect(result.status).toBe(403);
    expect(JSON.stringify(result.body)).toMatch(/pending admin approval/);
    expect(mockCheckTokenGate).not.toHaveBeenCalled();
  });

  it("returns 400 when photoUrl is missing", async () => {
    const result = await handleVisionRequest(makeRequest({}), config);

    expect(result.status).toBe(400);
    expect(mockCheckTokenGate).not.toHaveBeenCalled();
  });

  it("returns 429 with the full usage detail when the daily limit is reached", async () => {
    mockCheckTokenGate.mockResolvedValue({ allowed: false, reason: "limit_reached", tokensUsed: 250000 });

    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }), config);

    expect(result.status).toBe(429);
    expect(JSON.stringify(result.body)).toMatch(/250,000/);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("returns requiresConfirmation instead of calling OpenAI when near the limit and unconfirmed", async () => {
    mockCheckTokenGate.mockResolvedValue({ allowed: false, reason: "needs_confirmation", tokensUsed: 226000 });

    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }), config);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      requiresConfirmation: true,
      tokensUsed: 226000,
      dailyLimit: 250000,
    });
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("passes confirmNearLimit through to the token gate", async () => {
    await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg", confirmNearLimit: true }), config);

    expect(mockCheckTokenGate).toHaveBeenCalledWith(true);
  });

  it("calls OpenAI with the given prompt/schema and returns the parsed result", async () => {
    mockParse.mockResolvedValue({
      choices: [{ message: { parsed: { ok: true } } }],
      usage: { total_tokens: 512 },
    });

    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }), config);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ result: { ok: true } });
    expect(mockParse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system", content: "system prompt" }),
        ]),
      })
    );
    expect(mockReportTokens).toHaveBeenCalledWith(512);
  });

  it("returns 502 with the full error message and stack when the OpenAI call throws", async () => {
    const err = new Error("OpenAI request failed: 502 Bad Gateway");
    mockParse.mockRejectedValue(err);

    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }), config);

    expect(result.status).toBe(502);
    expect(JSON.stringify(result.body)).toMatch(/502 Bad Gateway/);
    expect(mockReportTokens).not.toHaveBeenCalled();
  });

  it("returns 502 when the model returns no parsed content (e.g. refusal)", async () => {
    mockParse.mockResolvedValue({ choices: [{ message: { parsed: null } }], usage: { total_tokens: 10 } });

    const result = await handleVisionRequest(makeRequest({ photoUrl: "https://x/y.jpg" }), config);

    expect(result.status).toBe(502);
    expect(mockReportTokens).not.toHaveBeenCalled();
  });
});
