import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_TOKEN_LIMIT,
  NEAR_LIMIT_THRESHOLD,
  TOKEN_TRACKER_URL,
  checkTokenGate,
  getTokensUsed,
  reportTokens,
} from "./tokenTracker";

function mockFetchOnce(response: Partial<Response> & { ok: boolean; json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: response.ok,
      json: response.json ?? (async () => ({})),
    } as Response)
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getTokensUsed", () => {
  it("GETs the tracker URL and returns the tokens count", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ date: "2026-07-01", tokens: 12345 }) });

    const result = await getTokensUsed();

    expect(result).toBe(12345);
    expect(fetch).toHaveBeenCalledWith(TOKEN_TRACKER_URL);
  });

  it("returns null (fail open) when the response is not ok", async () => {
    mockFetchOnce({ ok: false });

    const result = await getTokensUsed();

    expect(result).toBeNull();
  });

  it("returns null (fail open) when the tracker is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const result = await getTokensUsed();

    expect(result).toBeNull();
  });

  it("returns null (fail open) when the response body is malformed", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ tokens: "not-a-number" }) });

    const result = await getTokensUsed();

    expect(result).toBeNull();
  });
});

describe("reportTokens", () => {
  it("POSTs the token count to the tracker", async () => {
    mockFetchOnce({ ok: true });

    await reportTokens(4321);

    expect(fetch).toHaveBeenCalledWith(
      TOKEN_TRACKER_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tokens: 4321 }),
      })
    );
  });

  it("does not throw when the tracker is unreachable (fail open)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    await expect(reportTokens(100)).resolves.toBeUndefined();
  });
});

describe("checkTokenGate", () => {
  it("allows the call when usage is well under the near-limit threshold", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ tokens: 1000 }) });

    const result = await checkTokenGate(false);

    expect(result).toEqual({ allowed: true });
  });

  it("allows the call when the tracker is unreachable (fail open)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const result = await checkTokenGate(false);

    expect(result).toEqual({ allowed: true });
  });

  it("requires confirmation when usage is at or above the near-limit threshold and not yet confirmed", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ tokens: NEAR_LIMIT_THRESHOLD }) });

    const result = await checkTokenGate(false);

    expect(result).toEqual({
      allowed: false,
      reason: "needs_confirmation",
      tokensUsed: NEAR_LIMIT_THRESHOLD,
    });
  });

  it("allows the call when near the limit but the caller already confirmed", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ tokens: NEAR_LIMIT_THRESHOLD }) });

    const result = await checkTokenGate(true);

    expect(result).toEqual({ allowed: true });
  });

  it("blocks the call outright when usage is at or over the daily limit, even if confirmed", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ tokens: DAILY_TOKEN_LIMIT }) });

    const result = await checkTokenGate(true);

    expect(result).toEqual({
      allowed: false,
      reason: "limit_reached",
      tokensUsed: DAILY_TOKEN_LIMIT,
    });
  });
});
