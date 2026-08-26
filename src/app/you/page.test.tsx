import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = vi.fn();
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/you",
}));

const mockSignOut = vi.fn();
vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
vi.mock("@/lib/firebase/client", () => ({ auth: {} }));

const { default: YouPage } = await import("./page");

beforeEach(() => {
  mockReplace.mockReset();
  mockSignOut.mockReset();
});

describe("YouPage", () => {
  it("shows the signed-in user's email", () => {
    mockUseAuth.mockReturnValue({ user: { email: "jason@astrojason.com", displayName: null }, role: "USER" });
    render(<YouPage />);

    expect(screen.getByText("jason@astrojason.com")).toBeInTheDocument();
  });

  it("signs out and redirects to /login", async () => {
    mockSignOut.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: { email: "jason@astrojason.com", displayName: null }, role: "USER" });
    const user = userEvent.setup();
    render(<YouPage />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("shows a link to manage users for admins", () => {
    mockUseAuth.mockReturnValue({ user: { email: "admin@x.com", displayName: null }, role: "ADMIN" });
    render(<YouPage />);

    expect(screen.getByRole("link", { name: /manage users/i })).toHaveAttribute("href", "/admin");
  });

  it("hides the manage-users link for non-admins", () => {
    mockUseAuth.mockReturnValue({ user: { email: "user@x.com", displayName: null }, role: "USER" });
    render(<YouPage />);

    expect(screen.queryByRole("link", { name: /manage users/i })).not.toBeInTheDocument();
  });
});
