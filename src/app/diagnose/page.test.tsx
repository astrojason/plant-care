import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = vi.fn();
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/diagnose",
}));

type SnapshotCallback = (snapshot: unknown) => void;
let capturedOnNext: SnapshotCallback | null = null;

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __collection: true })),
  onSnapshot: (_ref: unknown, onNext: SnapshotCallback) => {
    capturedOnNext = onNext;
    return vi.fn();
  },
}));

const { default: DiagnosePage } = await import("./page");

beforeEach(() => {
  capturedOnNext = null;
  mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, loading: false });
});

describe("DiagnosePage", () => {
  it("shows an empty state prompting to add a plant first", () => {
    render(<DiagnosePage />);
    act(() => capturedOnNext?.({ docs: [] }));

    expect(screen.getByText(/add a plant first/i)).toBeInTheDocument();
  });

  it("links each plant to its detail page with ?diagnose=1", () => {
    render(<DiagnosePage />);
    act(() =>
      capturedOnNext?.({
        docs: [
          {
            id: "plant-1",
            data: () => ({
              nickname: "Fig",
              primaryPhotoUrl: "https://x/y.jpg",
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      })
    );

    expect(screen.getByText("Fig").closest("a")).toHaveAttribute("href", "/plants/plant-1?diagnose=1");
  });
});
