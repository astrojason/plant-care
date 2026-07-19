import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
vi.mock("./AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockSignOut = vi.fn();
vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("@/lib/firebase/client", () => ({ auth: {} }));

const { AuthGuard } = await import("./AuthGuard");

const mockRefreshRole = vi.fn();

beforeEach(() => {
  mockUseAuth.mockReset();
  mockReplace.mockReset();
  mockSignOut.mockReset();
  mockRefreshRole.mockReset();
});

describe("AuthGuard", () => {
  it("renders a loading state and does not redirect while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true, refreshRole: mockRefreshRole });

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /login and renders nothing when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false, refreshRole: mockRefreshRole });

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("shows a pending-approval screen instead of redirecting when signed in but not yet authorized", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user-1" },
      role: "PENDING",
      loading: false,
      refreshRole: mockRefreshRole,
    });

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument();
  });

  it("renders children for an authorized USER", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user-1" },
      role: "USER",
      loading: false,
      refreshRole: mockRefreshRole,
    });

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders children for ADMIN and SUPERADMIN too", () => {
    for (const role of ["ADMIN", "SUPERADMIN"]) {
      mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, role, loading: false, refreshRole: mockRefreshRole });

      const { unmount } = render(
        <AuthGuard>
          <div>protected content</div>
        </AuthGuard>
      );

      expect(screen.getByText("protected content")).toBeInTheDocument();
      unmount();
    }
  });

  describe("requireAdmin", () => {
    it("blocks a plain USER with an access-denied message", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "user-1" },
        role: "USER",
        loading: false,
        refreshRole: mockRefreshRole,
      });

      render(
        <AuthGuard requireAdmin>
          <div>admin content</div>
        </AuthGuard>
      );

      expect(screen.queryByText("admin content")).not.toBeInTheDocument();
      expect(screen.getByText("You don't have access to this page.")).toBeInTheDocument();
    });

    it("allows ADMIN and SUPERADMIN through", () => {
      for (const role of ["ADMIN", "SUPERADMIN"]) {
        mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, role, loading: false, refreshRole: mockRefreshRole });

        const { unmount } = render(
          <AuthGuard requireAdmin>
            <div>admin content</div>
          </AuthGuard>
        );

        expect(screen.getByText("admin content")).toBeInTheDocument();
        unmount();
      }
    });
  });
});
