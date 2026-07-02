import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthCallback = (user: { uid: string } | null) => void;
let capturedCallback: AuthCallback | null = null;
const mockUnsubscribe = vi.fn();
const mockOnAuthStateChanged = vi.fn((_auth: unknown, cb: AuthCallback) => {
  capturedCallback = cb;
  return mockUnsubscribe;
});

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: [unknown, AuthCallback]) => mockOnAuthStateChanged(...args),
}));

vi.mock("@/lib/firebase/client", () => ({ auth: {} }));

const { AuthProvider, useAuth } = await import("./AuthProvider");

function Consumer() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? `signed-in:${user.uid}` : "signed-out"}</div>;
}

beforeEach(() => {
  capturedCallback = null;
  mockOnAuthStateChanged.mockClear();
  mockUnsubscribe.mockClear();
});

describe("AuthProvider / useAuth", () => {
  it("starts in a loading state before the first auth callback fires", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("reflects a signed-out user once the callback fires with null", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    act(() => {
      capturedCallback?.(null);
    });

    expect(screen.getByText("signed-out")).toBeInTheDocument();
  });

  it("reflects a signed-in user once the callback fires with a user", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    act(() => {
      capturedCallback?.({ uid: "user-123" });
    });

    expect(screen.getByText("signed-in:user-123")).toBeInTheDocument();
  });

  it("unsubscribes from onAuthStateChanged on unmount", () => {
    const { unmount } = render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
