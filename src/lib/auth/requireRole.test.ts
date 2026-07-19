import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerifyIdToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
}));

const { requireAuthorized, requireAdmin, requireSuperAdmin } = await import("./requireRole");

function makeRequest(headers: Record<string, string> = { authorization: "Bearer valid-token" }) {
  return new Request("http://localhost/api/test", { method: "POST", headers });
}

beforeEach(() => {
  mockVerifyIdToken.mockReset();
});

describe("requireAuthorized", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const result = await requireAuthorized(makeRequest({}));

    expect(result).toEqual({ status: 401, body: expect.anything() });
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 with the full error message when token verification fails", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Firebase ID token has expired"));

    const result = await requireAuthorized(makeRequest());

    expect(result).toMatchObject({ status: 401 });
    expect(JSON.stringify(result)).toMatch(/Firebase ID token has expired/);
  });

  it("returns 403 when the token has no role claim (PENDING)", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "user-1" });

    const result = await requireAuthorized(makeRequest());

    expect(result).toMatchObject({ status: 403 });
  });

  it("returns the uid and role for USER", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "user-1", role: "USER" });

    const result = await requireAuthorized(makeRequest());

    expect(result).toEqual({ uid: "user-1", role: "USER" });
  });

  it("returns the uid and role for ADMIN", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const result = await requireAuthorized(makeRequest());

    expect(result).toEqual({ uid: "admin-1", role: "ADMIN" });
  });
});

describe("requireAdmin", () => {
  it("returns 403 for an authorized but non-admin USER", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "user-1", role: "USER" });

    const result = await requireAdmin(makeRequest());

    expect(result).toMatchObject({ status: 403 });
  });

  it("propagates the underlying 401 when the token itself is invalid", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));

    const result = await requireAdmin(makeRequest());

    expect(result).toMatchObject({ status: 401 });
  });

  it("returns the uid and role for ADMIN", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const result = await requireAdmin(makeRequest());

    expect(result).toEqual({ uid: "admin-1", role: "ADMIN" });
  });

  it("returns the uid and role for SUPERADMIN", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "super-1", role: "SUPERADMIN" });

    const result = await requireAdmin(makeRequest());

    expect(result).toEqual({ uid: "super-1", role: "SUPERADMIN" });
  });
});

describe("requireSuperAdmin", () => {
  it("returns 403 for a regular ADMIN", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const result = await requireSuperAdmin(makeRequest());

    expect(result).toMatchObject({ status: 403 });
  });

  it("returns the uid and role for SUPERADMIN", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "super-1", role: "SUPERADMIN" });

    const result = await requireSuperAdmin(makeRequest());

    expect(result).toEqual({ uid: "super-1", role: "SUPERADMIN" });
  });
});
