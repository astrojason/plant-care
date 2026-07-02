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

const { AuthGuard } = await import("./AuthGuard");

beforeEach(() => {
  mockUseAuth.mockReset();
  mockReplace.mockReset();
});

describe("AuthGuard", () => {
  it("renders a loading state and does not redirect while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /login and renders nothing when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("renders children and does not redirect when authenticated", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, loading: false });

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
