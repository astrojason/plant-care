import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHandleVisionRequest = vi.fn();
vi.mock("@/lib/openai/visionRoute", () => ({
  handleVisionRequest: (...args: unknown[]) => mockHandleVisionRequest(...args),
}));

const { POST } = await import("./route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/diagnose", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockHandleVisionRequest.mockReset();
  mockHandleVisionRequest.mockResolvedValue({ status: 200, body: { result: { ok: true } } });
});

describe("POST /api/diagnose", () => {
  it("returns 400 without calling handleVisionRequest when plantId is missing", async () => {
    const res = await POST(makeRequest({ photoUrl: "https://x/y.jpg" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(JSON.stringify(json)).toMatch(/plantId is required/);
    expect(mockHandleVisionRequest).not.toHaveBeenCalled();
  });

  it("returns 400 when plantId is not a string", async () => {
    const res = await POST(makeRequest({ photoUrl: "https://x/y.jpg", plantId: 123 }));

    expect(res.status).toBe(400);
    expect(mockHandleVisionRequest).not.toHaveBeenCalled();
  });

  it("delegates to handleVisionRequest when plantId is present", async () => {
    const res = await POST(makeRequest({ photoUrl: "https://x/y.jpg", plantId: "plant-1" }));
    const json = await res.json();

    expect(mockHandleVisionRequest).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(json).toEqual({ result: { ok: true } });
  });

  it("folds a soil test reading into the user prompt text", async () => {
    await POST(
      makeRequest({
        photoUrl: "https://x/y.jpg",
        plantId: "plant-1",
        soilTest: { ph: 6.5, moistureLevel: 7, lightLevel: 5 },
      })
    );

    const config = mockHandleVisionRequest.mock.calls[0][1];
    expect(config.userPromptText).toMatch(/pH 6\.5/);
    expect(config.userPromptText).toMatch(/moisture 7\/10/);
    expect(config.userPromptText).toMatch(/light 5\/8/);
  });

  it("ignores a malformed soil test payload", async () => {
    await POST(
      makeRequest({ photoUrl: "https://x/y.jpg", plantId: "plant-1", soilTest: "not an object" })
    );

    const config = mockHandleVisionRequest.mock.calls[0][1];
    expect(config.userPromptText).toBe("Diagnose any health issues visible in this photo of my plant.");
  });
});
