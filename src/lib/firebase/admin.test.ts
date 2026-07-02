import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApps: unknown[] = [];
const mockInitializeApp = vi.fn((...args: unknown[]) => {
  const app = { name: "mock-app", args };
  mockApps.push(app);
  return app;
});
const mockCert = vi.fn((sa: unknown) => ({ __cert: sa }));
const mockVerifyIdToken = vi.fn();
const mockGetAuth = vi.fn(() => ({ verifyIdToken: mockVerifyIdToken }));

vi.mock("firebase-admin/app", () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  getApps: () => mockApps,
  cert: (sa: unknown) => mockCert(sa),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  mockApps.length = 0;
  mockInitializeApp.mockClear();
  mockCert.mockClear();
  mockVerifyIdToken.mockClear();
  mockGetAuth.mockClear();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("verifyIdToken", () => {
  it("throws a clear error when FIREBASE_SERVICE_ACCOUNT_KEY is missing and no emulator is configured", async () => {
    const { verifyIdToken } = await import("./admin");

    await expect(verifyIdToken("some-token")).rejects.toThrow(
      /FIREBASE_SERVICE_ACCOUNT_KEY is not set/
    );
  });

  it("throws a clear error when FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "{not valid json";
    const { verifyIdToken } = await import("./admin");

    await expect(verifyIdToken("some-token")).rejects.toThrow(
      /FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON/
    );
  });

  it("initializes with the parsed service account credential and verifies the token", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({ project_id: "plant-care-test" });
    mockVerifyIdToken.mockResolvedValue({ uid: "user-123" });

    const { verifyIdToken } = await import("./admin");
    const result = await verifyIdToken("some-token");

    expect(mockCert).toHaveBeenCalledWith({ project_id: "plant-care-test" });
    expect(mockVerifyIdToken).toHaveBeenCalledWith("some-token");
    expect(result).toEqual({ uid: "user-123" });
  });

  it("skips service-account credentials and uses the emulator when FIREBASE_AUTH_EMULATOR_HOST is set", async () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    mockVerifyIdToken.mockResolvedValue({ uid: "emulator-user" });

    const { verifyIdToken } = await import("./admin");
    const result = await verifyIdToken("fake-emulator-token");

    expect(mockCert).not.toHaveBeenCalled();
    expect(result).toEqual({ uid: "emulator-user" });
  });

  it("reuses the already-initialized admin app across calls instead of re-initializing", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({ project_id: "plant-care-test" });
    mockVerifyIdToken.mockResolvedValue({ uid: "user-123" });

    const { verifyIdToken } = await import("./admin");
    await verifyIdToken("token-a");
    await verifyIdToken("token-b");

    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
  });
});
