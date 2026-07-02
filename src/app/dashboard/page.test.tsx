import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = vi.fn();
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

type SnapshotCallback = (snapshot: unknown) => void;
type ErrorCallback = (err: unknown) => void;
let capturedOnNext: SnapshotCallback | null = null;
let capturedOnError: ErrorCallback | null = null;
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __collection: true })),
  onSnapshot: (
    _ref: unknown,
    onNext: SnapshotCallback,
    onError: ErrorCallback
  ) => {
    capturedOnNext = onNext;
    capturedOnError = onError;
    return mockUnsubscribe;
  },
}));

const { default: DashboardPage } = await import("./page");

function toTimestampLike(date: Date | null) {
  return date ? { toDate: () => date } : null;
}

function makeDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      nickname: "Test Plant",
      primaryPhotoUrl: "https://example.com/p.jpg",
      wateringIntervalDays: 7,
      lastWateredAt: toTimestampLike(new Date("2026-06-25T00:00:00Z")),
      createdAt: toTimestampLike(new Date("2026-01-01T00:00:00Z")),
      updatedAt: toTimestampLike(new Date("2026-01-01T00:00:00Z")),
      ...overrides,
    }),
  };
}

beforeEach(() => {
  capturedOnNext = null;
  capturedOnError = null;
  mockUnsubscribe.mockClear();
  mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, loading: false });
});

describe("DashboardPage", () => {
  it("shows a loading state before the first snapshot arrives", () => {
    render(<DashboardPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an empty state when the user has no plants", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnNext?.({ docs: [] });
    });

    expect(screen.getByText(/no plants yet/i)).toBeInTheDocument();
  });

  it("renders plant cards from the snapshot", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnNext?.({ docs: [makeDoc("p1", { nickname: "Fig" }), makeDoc("p2", { nickname: "Cactus" })] });
    });

    expect(screen.getByText("Fig")).toBeInTheDocument();
    expect(screen.getByText("Cactus")).toBeInTheDocument();
  });

  it("shows the full error via ErrorBlock when the Firestore subscription fails", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnError?.(new Error("Firestore permission denied"));
    });

    expect(screen.getByText("Firestore permission denied")).toBeInTheDocument();
  });

  it("has a link to the add-plant page", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("link", { name: /add plant/i })).toHaveAttribute("href", "/plants/new");
  });
});
