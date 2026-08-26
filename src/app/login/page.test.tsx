import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSignInWithPopup = vi.fn();
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));

vi.mock("@/lib/firebase/client", () => ({ auth: {} }));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const { default: LoginPage } = await import("./page");

beforeEach(() => {
  mockSignInWithPopup.mockReset();
  mockReplace.mockReset();
});

describe("LoginPage", () => {
  it("redirects to /dashboard after a successful Google sign-in", async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { uid: "user-1" } });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the full error via ErrorBlock when sign-in fails, without redirecting", async () => {
    mockSignInWithPopup.mockRejectedValue(new Error("popup closed by user"));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(await screen.findByText("popup closed by user")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
