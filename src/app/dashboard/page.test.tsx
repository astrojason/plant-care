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
  usePathname: () => "/dashboard",
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

const mockLogCareEvent = vi.fn();
vi.mock("@/lib/care/log", () => ({
  logCareEvent: (...args: unknown[]) => mockLogCareEvent(...args),
}));

const { default: DashboardPage } = await import("./page");

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
  mockLogCareEvent.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, loading: false });
});

describe("DashboardPage (Today)", () => {
  it("shows skeleton rows, not bare text, before the first snapshot arrives", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText(/^loading$/i)).not.toBeInTheDocument();
  });

  it("shows 'Nothing due today' in place of the queue when the user has no plants", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnNext?.({ docs: [] });
    });

    expect(screen.getByText("Nothing due today")).toBeInTheDocument();
    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("puts an overdue plant's care task in the due queue", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnNext?.({
        docs: [
          makeDoc("p1", {
            nickname: "Fig",
            wateringIntervalDays: 7,
            lastWateredAt: toTimestampLike(new Date(Date.now() - 10 * DAY_MS)),
          }),
        ],
      });
    });

    expect(screen.getByText("Fig")).toBeInTheDocument();
    expect(screen.getByText(/day.*overdue/)).toBeInTheDocument();
  });

  it("puts a plant due later this week in the 'Later this week' section, not the due queue", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnNext?.({
        docs: [
          makeDoc("p1", {
            nickname: "Cactus",
            wateringIntervalDays: 7,
            lastWateredAt: toTimestampLike(new Date(Date.now() - 2 * DAY_MS)), // due in 5 days
          }),
        ],
      });
    });

    expect(screen.getByText("All caught up")).toBeInTheDocument();
    expect(screen.getByText("Cactus")).toBeInTheDocument();
  });

  it("logs a care event and optimistically removes the card when its check button is clicked", async () => {
    mockLogCareEvent.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DashboardPage />);
    act(() => {
      capturedOnNext?.({
        docs: [
          makeDoc("p1", {
            nickname: "Fig",
            wateringIntervalDays: 7,
            lastWateredAt: toTimestampLike(new Date(Date.now() - 10 * DAY_MS)),
          }),
        ],
      });
    });

    await user.click(screen.getByRole("button", { name: /log water for fig/i }));

    expect(mockLogCareEvent).toHaveBeenCalledWith("user-1", "p1", "watered");
  });

  it("shows the full error via ErrorBlock when the Firestore subscription fails", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnError?.(new Error("Firestore permission denied"));
    });

    expect(screen.getByText("Firestore permission denied")).toBeInTheDocument();
  });

  it("has a link to the Plants tab from 'All plants'", () => {
    render(<DashboardPage />);
    act(() => {
      capturedOnNext?.({ docs: [] });
    });

    expect(screen.getByRole("link", { name: /all plants/i })).toHaveAttribute("href", "/plants");
  });
});
