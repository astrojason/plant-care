import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = vi.fn();
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/plants",
}));

type SnapshotCallback = (snapshot: unknown) => void;
type ErrorCallback = (err: unknown) => void;
let capturedOnNext: SnapshotCallback | null = null;
let capturedOnError: ErrorCallback | null = null;
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __collection: true })),
  onSnapshot: (_ref: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
    capturedOnNext = onNext;
    capturedOnError = onError;
    return mockUnsubscribe;
  },
}));

const { default: PlantsPage } = await import("./page");

const DAY_MS = 24 * 60 * 60 * 1000;

function toTimestampLike(date: Date | null) {
  return date ? { toDate: () => date } : null;
}

function makeDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      nickname: "Test Plant",
      primaryPhotoUrl: "https://example.com/p.jpg",
      wateringIntervalDays: null,
      lastWateredAt: null,
      createdAt: toTimestampLike(new Date()),
      updatedAt: toTimestampLike(new Date()),
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

describe("PlantsPage", () => {
  it("shows skeleton rows before the first snapshot arrives", () => {
    render(<PlantsPage />);

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  });

  it("shows an empty state with a link to add the first plant", () => {
    render(<PlantsPage />);
    act(() => capturedOnNext?.({ docs: [] }));

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add your first plant/i })).toHaveAttribute("href", "/plants/new");
  });

  it("groups an overdue plant under 'Needs attention' and an on-track plant under 'Doing fine'", () => {
    render(<PlantsPage />);
    act(() =>
      capturedOnNext?.({
        docs: [
          makeDoc("p1", {
            nickname: "Overdue Fig",
            wateringIntervalDays: 7,
            lastWateredAt: toTimestampLike(new Date(Date.now() - 10 * DAY_MS)),
          }),
          makeDoc("p2", {
            nickname: "Happy Cactus",
            wateringIntervalDays: 7,
            lastWateredAt: toTimestampLike(new Date(Date.now() - 1 * DAY_MS)),
          }),
        ],
      })
    );

    expect(screen.getByText(/needs attention/i)).toBeInTheDocument();
    expect(screen.getByText(/doing fine/i)).toBeInTheDocument();
    expect(screen.getByText("Overdue Fig")).toBeInTheDocument();
    expect(screen.getByText("Happy Cactus")).toBeInTheDocument();
  });

  it("filters plants by nickname when searching", async () => {
    const user = userEvent.setup();
    render(<PlantsPage />);
    act(() =>
      capturedOnNext?.({
        docs: [makeDoc("p1", { nickname: "Fig" }), makeDoc("p2", { nickname: "Cactus" })],
      })
    );

    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.type(screen.getByPlaceholderText(/search plants/i), "Fig");

    expect(screen.getByText("Fig")).toBeInTheDocument();
    expect(screen.queryByText("Cactus")).not.toBeInTheDocument();
  });

  it("links each row to its plant detail page", () => {
    render(<PlantsPage />);
    act(() => capturedOnNext?.({ docs: [makeDoc("p1", { nickname: "Fig" })] }));

    expect(screen.getByText("Fig").closest("a")).toHaveAttribute("href", "/plants/p1");
  });

  it("shows the full error via ErrorBlock when the Firestore subscription fails", () => {
    render(<PlantsPage />);
    act(() => capturedOnError?.(new Error("Firestore permission denied")));

    expect(screen.getByText("Firestore permission denied")).toBeInTheDocument();
  });
});
