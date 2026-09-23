import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApps: unknown[] = [];
const mockInitializeApp = vi.fn((...args: unknown[]) => {
  const app = { name: "mock-app", args };
  mockApps.push(app);
  return app;
});
const mockCert = vi.fn((sa: unknown) => ({ __cert: sa }));
const mockVerifyIdToken = vi.fn();
const mockSetCustomUserClaims = vi.fn();
const mockGetUserByEmail = vi.fn();
const mockGetUser = vi.fn();
const mockListUsers = vi.fn();
const mockGetAuth = vi.fn<(...args: unknown[]) => unknown>(() => ({
  verifyIdToken: mockVerifyIdToken,
  setCustomUserClaims: mockSetCustomUserClaims,
  getUserByEmail: mockGetUserByEmail,
  getUser: mockGetUser,
  listUsers: mockListUsers,
}));

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
  mockSetCustomUserClaims.mockClear();
  mockGetUserByEmail.mockClear();
  mockGetUser.mockClear();
  mockListUsers.mockClear();
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

describe("setUserRole", () => {
  it("sets the role custom claim on the given uid", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({ project_id: "plant-care-test" });
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const { setUserRole } = await import("./admin");
    await setUserRole("user-123", "ADMIN");

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("user-123", { role: "ADMIN" });
  });
});

describe("getUserByEmail", () => {
  it("returns the user's uid, email, and role from custom claims", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({ project_id: "plant-care-test" });
    mockGetUserByEmail.mockResolvedValue({
      uid: "user-123",
      email: "jason@astrojason.com",
      customClaims: { role: "ADMIN" },
    });

    const { getUserByEmail } = await import("./admin");
    const result = await getUserByEmail("jason@astrojason.com");

    expect(mockGetUserByEmail).toHaveBeenCalledWith("jason@astrojason.com");
    expect(result).toEqual({ uid: "user-123", email: "jason@astrojason.com", role: "ADMIN" });
  });

  it("reports role as null when no valid role claim is set", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({ project_id: "plant-care-test" });
    mockGetUserByEmail.mockResolvedValue({ uid: "user-123", email: "new@example.com", customClaims: undefined });

    const { getUserByEmail } = await import("./admin");
    const result = await getUserByEmail("new@example.com");

    expect(result).toEqual({ uid: "user-123", email: "new@example.com", role: null });
  });
});

describe("getUserById", () => {
  it("returns the user's uid, email, and role from custom claims", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({ project_id: "plant-care-test" });
    mockGetUser.mockResolvedValue({
      uid: "user-123",
      email: "jason@astrojason.com",
      customClaims: { role: "SUPERADMIN" },
    });

    const { getUserById } = await import("./admin");
    const result = await getUserById("user-123");

    expect(mockGetUser).toHaveBeenCalledWith("user-123");
    expect(result).toEqual({ uid: "user-123", email: "jason@astrojason.com", role: "SUPERADMIN" });
  });
});

describe("listAllUsers", () => {
  it("returns all users across pages, mapped with their role", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({ project_id: "plant-care-test" });
    mockListUsers
      .mockResolvedValueOnce({
        users: [{ uid: "user-1", email: "a@example.com", customClaims: { role: "USER" } }],
        pageToken: "next-page",
      })
      .mockResolvedValueOnce({
        users: [{ uid: "user-2", email: "b@example.com", customClaims: undefined }],
        pageToken: undefined,
      });

    const { listAllUsers } = await import("./admin");
    const result = await listAllUsers();

    expect(mockListUsers).toHaveBeenCalledTimes(2);
    expect(mockListUsers).toHaveBeenNthCalledWith(1, 1000, undefined);
    expect(mockListUsers).toHaveBeenNthCalledWith(2, 1000, "next-page");
    expect(result).toEqual([
      { uid: "user-1", email: "a@example.com", role: "USER" },
      { uid: "user-2", email: "b@example.com", role: null },
    ]);
  });
});
