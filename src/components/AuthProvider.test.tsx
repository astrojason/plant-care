import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthCallback = (user: { uid: string } | null) => void;
let capturedCallback: AuthCallback | null = null;
const mockUnsubscribe = vi.fn();
const mockOnAuthStateChanged = vi.fn((_auth: unknown, cb: AuthCallback) => {
  capturedCallback = cb;
  return mockUnsubscribe;
});

const mockGetIdTokenResult = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: [unknown, AuthCallback]) => mockOnAuthStateChanged(...args),
  getIdTokenResult: (...args: unknown[]) => mockGetIdTokenResult(...args),
}));

vi.mock("@/lib/firebase/client", () => ({ auth: { currentUser: null } }));

const { AuthProvider, useAuth } = await import("./AuthProvider");
const { auth: mockAuth } = await import("@/lib/firebase/client");

function Consumer() {
  const { user, role, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? `signed-in:${user.uid}:${role}` : "signed-out"}</div>;
}

beforeEach(() => {
  capturedCallback = null;
  mockOnAuthStateChanged.mockClear();
  mockUnsubscribe.mockClear();
  mockGetIdTokenResult.mockReset();
  mockGetIdTokenResult.mockResolvedValue({ claims: {} });
  (mockAuth as { currentUser: unknown }).currentUser = null;
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

  it("reflects a signed-out user once the callback fires with null", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await act(async () => {
      capturedCallback?.(null);
    });

    expect(screen.getByText("signed-out")).toBeInTheDocument();
    expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  });

  it("defaults to PENDING when the token has no role claim", async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: {} });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await act(async () => {
      capturedCallback?.({ uid: "user-123" });
    });

    expect(screen.getByText("signed-in:user-123:PENDING")).toBeInTheDocument();
    expect(mockGetIdTokenResult).toHaveBeenCalledWith({ uid: "user-123" }, true);
  });

  it("reflects the role claim once the callback fires with an authorized user", async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { role: "USER" } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await act(async () => {
      capturedCallback?.({ uid: "user-123" });
    });

    expect(screen.getByText("signed-in:user-123:USER")).toBeInTheDocument();
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

  it("refreshRole re-resolves the role from a fresh token for the current user", async () => {
    mockGetIdTokenResult.mockResolvedValue({ claims: { role: "PENDING" } });

    function RefreshConsumer() {
      const { role, refreshRole } = useAuth();
      return (
        <div>
          <span>role:{role ?? "none"}</span>
          <button onClick={() => refreshRole()}>refresh</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <RefreshConsumer />
      </AuthProvider>
    );

    await act(async () => {
      capturedCallback?.({ uid: "user-123" });
    });
    expect(screen.getByText("role:PENDING")).toBeInTheDocument();

    (mockAuth as { currentUser: unknown }).currentUser = { uid: "user-123" };
    mockGetIdTokenResult.mockResolvedValue({ claims: { role: "USER" } });

    await act(async () => {
      screen.getByText("refresh").click();
    });

    expect(screen.getByText("role:USER")).toBeInTheDocument();
  });
});
