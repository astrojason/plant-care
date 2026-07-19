import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth/requireRole", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

const mockListAllUsers = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  listAllUsers: (...args: unknown[]) => mockListAllUsers(...args),
}));

const { GET } = await import("./route");

function makeRequest() {
  return new Request("http://localhost/api/admin/users", {
    headers: { authorization: "Bearer token" },
  });
}

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockListAllUsers.mockReset();
});

describe("GET /api/admin/users", () => {
  it("returns the caller's auth error without listing users", async () => {
    mockRequireAdmin.mockResolvedValue({ status: 403, body: { error: { message: "Admin role required." } } });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.message).toBe("Admin role required.");
    expect(mockListAllUsers).not.toHaveBeenCalled();
  });

  it("returns the full user list for an authorized admin", async () => {
    mockRequireAdmin.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });
    mockListAllUsers.mockResolvedValue([
      { uid: "user-1", email: "a@example.com", role: "USER" },
      { uid: "user-2", email: "b@example.com", role: null },
    ]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.users).toHaveLength(2);
  });
});
