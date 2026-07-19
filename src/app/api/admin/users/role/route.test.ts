import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth/requireRole", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

const mockGetUserById = vi.fn();
const mockSetUserRole = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  setUserRole: (...args: unknown[]) => mockSetUserRole(...args),
}));

const { POST } = await import("./route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/users/role", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockGetUserById.mockReset();
  mockSetUserRole.mockReset();
  mockRequireAdmin.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });
  mockGetUserById.mockResolvedValue({ uid: "target-1", email: "target@example.com", role: "PENDING" });
});

describe("POST /api/admin/users/role", () => {
  it("returns the caller's auth error without touching roles", async () => {
    mockRequireAdmin.mockResolvedValue({ status: 403, body: { error: { message: "Admin role required." } } });

    const res = await POST(makeRequest({ uid: "target-1", role: "USER" }));

    expect(res.status).toBe(403);
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  it("returns 400 when uid is missing", async () => {
    const res = await POST(makeRequest({ role: "USER" }));

    expect(res.status).toBe(400);
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  it("returns 400 when role is not a valid Role", async () => {
    const res = await POST(makeRequest({ uid: "target-1", role: "SUPERUSER" }));

    expect(res.status).toBe(400);
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  it("returns 400 when an admin tries to change their own role", async () => {
    const res = await POST(makeRequest({ uid: "admin-1", role: "USER" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.message).toMatch(/cannot change your own role/);
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  it("promotes a PENDING user to USER", async () => {
    const res = await POST(makeRequest({ uid: "target-1", role: "USER" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ uid: "target-1", role: "USER" });
    expect(mockSetUserRole).toHaveBeenCalledWith("target-1", "USER");
  });

  it("a regular ADMIN cannot promote someone to SUPERADMIN", async () => {
    const res = await POST(makeRequest({ uid: "target-1", role: "SUPERADMIN" }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.message).toMatch(/Only a superadmin/);
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  it("a regular ADMIN cannot change an existing SUPERADMIN's role", async () => {
    mockGetUserById.mockResolvedValue({ uid: "target-1", email: "target@example.com", role: "SUPERADMIN" });

    const res = await POST(makeRequest({ uid: "target-1", role: "USER" }));

    expect(res.status).toBe(403);
    expect(mockSetUserRole).not.toHaveBeenCalled();
  });

  it("a SUPERADMIN can promote someone to SUPERADMIN", async () => {
    mockRequireAdmin.mockResolvedValue({ uid: "super-1", role: "SUPERADMIN" });

    const res = await POST(makeRequest({ uid: "target-1", role: "SUPERADMIN" }));

    expect(res.status).toBe(200);
    expect(mockSetUserRole).toHaveBeenCalledWith("target-1", "SUPERADMIN");
  });

  it("a SUPERADMIN can demote an existing SUPERADMIN", async () => {
    mockRequireAdmin.mockResolvedValue({ uid: "super-1", role: "SUPERADMIN" });
    mockGetUserById.mockResolvedValue({ uid: "target-1", email: "target@example.com", role: "SUPERADMIN" });

    const res = await POST(makeRequest({ uid: "target-1", role: "ADMIN" }));

    expect(res.status).toBe(200);
    expect(mockSetUserRole).toHaveBeenCalledWith("target-1", "ADMIN");
  });
});
