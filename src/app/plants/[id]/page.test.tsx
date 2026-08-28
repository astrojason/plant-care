import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetIdToken = vi.fn().mockResolvedValue("fake-id-token");
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "user-1", getIdToken: mockGetIdToken }, loading: false }),
}));

const mockReplace = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "plant-1" }),
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  usePathname: () => "/plants/plant-1",
  useSearchParams: () => new URLSearchParams(),
}));

type SnapshotCallback = (snapshot: unknown) => void;
type ErrorCallback = (err: unknown) => void;
const subscriptions: { onNext: SnapshotCallback; onError: ErrorCallback }[] = [];
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ __doc: true })),
  collection: vi.fn(() => ({ __collection: true })),
  query: vi.fn((ref: unknown) => ref),
  orderBy: vi.fn(() => ({ __orderBy: true })),
  onSnapshot: (_ref: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
    subscriptions.push({ onNext, onError });
    return mockUnsubscribe;
  },
}));

vi.mock("firebase/storage", () => ({
  ref: vi.fn(() => ({ __ref: true })),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

const mockLogCareEvent = vi.fn();
const mockDeleteCareEvent = vi.fn();
vi.mock("@/lib/care/log", () => ({
  logCareEvent: (...args: unknown[]) => mockLogCareEvent(...args),
  deleteCareEvent: (...args: unknown[]) => mockDeleteCareEvent(...args),
}));

const mockDeletePlant = vi.fn();
const mockUpdatePlantSpecies = vi.fn();
const mockUpdateCareSchedule = vi.fn();
vi.mock("@/lib/firestore/plants", () => ({
  deletePlant: (...args: unknown[]) => mockDeletePlant(...args),
  updatePlantSpecies: (...args: unknown[]) => mockUpdatePlantSpecies(...args),
  updateCareSchedule: (...args: unknown[]) => mockUpdateCareSchedule(...args),
}));

const mockAddPlantPhoto = vi.fn();
vi.mock("@/lib/firestore/photos", () => ({
  addPlantPhoto: (...args: unknown[]) => mockAddPlantPhoto(...args),
}));

const mockCreateDiagnosis = vi.fn();
vi.mock("@/lib/firestore/diagnoses", () => ({
  createDiagnosis: (...args: unknown[]) => mockCreateDiagnosis(...args),
}));

const mockAddSoilTest = vi.fn();
const mockDeleteSoilTest = vi.fn();
vi.mock("@/lib/firestore/soilTests", () => ({
  addSoilTest: (...args: unknown[]) => mockAddSoilTest(...args),
  deleteSoilTest: (...args: unknown[]) => mockDeleteSoilTest(...args),
}));

vi.mock("@/components/PhotoUploader", () => ({
  PhotoUploader: ({ onUploaded }: { onUploaded: (p: { storagePath: string; downloadUrl: string }) => void }) => (
    <button
      type="button"
      onClick={() => onUploaded({ storagePath: "users/user-1/plants/plant-1/x.jpg", downloadUrl: "https://x/diag.jpg" })}
    >
      Fake diagnose upload
    </button>
  ),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { default: PlantDetailPage } = await import("./page");

function ts(date: Date) {
  return { toDate: () => date };
}

function plantSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    exists: () => true,
    id: "plant-1",
    data: () => ({
      nickname: "Fig Newton",
      speciesCommonName: "Fiddle Leaf Fig",
      speciesScientificName: "Ficus lyrata",
      location: "Living room",
      primaryPhotoUrl: "https://x/y.jpg",
      wateringIntervalDays: 7,
      fertilizingIntervalDays: 30,
      mistingIntervalDays: null,
      lastWateredAt: ts(new Date("2026-06-25")),
      lastFertilizedAt: null,
      lastMistedAt: null,
      createdAt: ts(new Date("2026-01-01")),
      updatedAt: ts(new Date("2026-01-01")),
      ...overrides,
    }),
  };
}

const DIAGNOSIS_RESULT = {
  overall_assessment: "Looks a bit thirsty.",
  detected_issues: [{ issue: "Underwatering", confidence: 0.6, symptoms_observed: ["Drooping leaves"] }],
  suggested_treatment: "Water more consistently.",
  urgency: "low" as const,
};

function renderAndLoadPlant() {
  render(<PlantDetailPage />);
  act(() => {
    subscriptions[0]?.onNext(plantSnapshot());
    subscriptions[1]?.onNext({ docs: [] });
    subscriptions[2]?.onNext({ docs: [] });
    subscriptions[3]?.onNext({ docs: [] });
    subscriptions[4]?.onNext({ docs: [] });
  });
}

beforeEach(() => {
  subscriptions.length = 0;
  mockUnsubscribe.mockClear();
  mockLogCareEvent.mockReset();
  mockDeleteCareEvent.mockReset();
  mockDeletePlant.mockReset();
  mockUpdatePlantSpecies.mockReset();
  mockUpdateCareSchedule.mockReset();
  mockAddPlantPhoto.mockReset();
  mockCreateDiagnosis.mockReset();
  mockAddSoilTest.mockReset();
  mockDeleteSoilTest.mockReset();
  mockFetch.mockReset();
  mockReplace.mockReset();
  mockBack.mockReset();
  mockGetIdToken.mockClear();
});

describe("PlantDetailPage", () => {
  it("renders the plant's nickname and species from the snapshot", () => {
    renderAndLoadPlant();

    expect(screen.getByText("Fig Newton")).toBeInTheDocument();
    expect(screen.getByText(/Fiddle Leaf Fig/)).toBeInTheDocument();
  });

  it("logs a care event when a quick-log button is clicked", async () => {
    mockLogCareEvent.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: "Water" }));

    expect(mockLogCareEvent).toHaveBeenCalledWith("user-1", "plant-1", "watered");
  });

  it("deletes a care event with the correct type after confirmation", async () => {
    mockDeleteCareEvent.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PlantDetailPage />);
    act(() => {
      subscriptions[0]?.onNext(plantSnapshot());
      subscriptions[1]?.onNext({
        docs: [
          {
            id: "event-1",
            data: () => ({ eventType: "watered", occurredAt: ts(new Date("2026-06-25")) }),
          },
        ],
      });
      subscriptions[2]?.onNext({ docs: [] });
      subscriptions[3]?.onNext({ docs: [] });
      subscriptions[4]?.onNext({ docs: [] });
    });

    await user.click(screen.getByRole("button", { name: /delete watered event/i }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockDeleteCareEvent).toHaveBeenCalledWith("user-1", "plant-1", "event-1", "watered");
  });

  it("deletes the plant and redirects to the dashboard after confirming, via the overflow menu", async () => {
    mockDeletePlant.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Delete plant" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockDeletePlant).toHaveBeenCalledWith("user-1", "plant-1");
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("saves edited species fields from the overflow menu's sheet", async () => {
    mockUpdatePlantSpecies.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Edit species" }));
    const nicknameInput = screen.getByLabelText("Nickname");
    await user.clear(nicknameInput);
    await user.type(nicknameInput, "Big Fig");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdatePlantSpecies).toHaveBeenCalledWith(
      "user-1",
      "plant-1",
      expect.objectContaining({ nickname: "Big Fig" })
    );
  });

  it("saves edited care schedule intervals via the stepper", async () => {
    mockUpdateCareSchedule.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Edit schedule" }));
    const increaseWater = screen.getByRole("button", { name: "Increase Water" });
    await user.click(increaseWater);
    await user.click(increaseWater);
    await user.click(increaseWater);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdateCareSchedule).toHaveBeenCalledWith(
      "user-1",
      "plant-1",
      expect.objectContaining({ wateringIntervalDays: 10 })
    );
  });

  it("logs a soil test with pH, moisture, and light from the overflow menu's sheet", async () => {
    mockAddSoilTest.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Log soil test" }));
    await user.type(screen.getByLabelText("pH"), "6.5");
    await user.click(screen.getByRole("button", { name: "Increase moisture" }));
    await user.click(screen.getByRole("button", { name: "Increase light" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockAddSoilTest).toHaveBeenCalledWith("user-1", "plant-1", {
      ph: 6.5,
      moistureLevel: 1,
      lightLevel: 1,
      notes: null,
    });
  });

  it("deletes a soil test from history after confirmation", async () => {
    mockDeleteSoilTest.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PlantDetailPage />);
    act(() => {
      subscriptions[0]?.onNext(plantSnapshot());
      subscriptions[1]?.onNext({ docs: [] });
      subscriptions[2]?.onNext({ docs: [] });
      subscriptions[3]?.onNext({
        docs: [
          {
            id: "test-1",
            data: () => ({ ph: 6.5, moistureLevel: 7, lightLevel: 5, occurredAt: ts(new Date("2026-06-25")) }),
          },
        ],
      });
      subscriptions[4]?.onNext({ docs: [] });
    });

    await user.click(screen.getByRole("button", { name: "Delete soil test" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockDeleteSoilTest).toHaveBeenCalledWith("user-1", "plant-1", "test-1");
  });

  it("runs a diagnosis from the footer CTA, shows the result, and saves it on request", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: DIAGNOSIS_RESULT }) });
    mockAddPlantPhoto.mockResolvedValue("photo-1");
    mockCreateDiagnosis.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: "Something looks wrong" }));
    await user.click(screen.getByRole("button", { name: "Fake diagnose upload" }));

    expect(await screen.findByText("Looks a bit thirsty.")).toBeInTheDocument();
    expect(mockAddPlantPhoto).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save to plant" }));

    expect(mockAddPlantPhoto).toHaveBeenCalledWith(
      "user-1",
      "plant-1",
      "users/user-1/plants/plant-1/x.jpg",
      "https://x/diag.jpg",
      "diagnosis"
    );
    expect(mockCreateDiagnosis).toHaveBeenCalledWith("user-1", "plant-1", "photo-1", DIAGNOSIS_RESULT);
  });

  it("shows a confirm dialog when the diagnose call is near the token limit", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requiresConfirmation: true, tokensUsed: 230000, dailyLimit: 250000 }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: DIAGNOSIS_RESULT }) });
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: "Something looks wrong" }));
    await user.click(screen.getByRole("button", { name: "Fake diagnose upload" }));

    expect(await screen.findByText(/near today's ai budget/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /proceed/i }));

    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/diagnose",
      expect.objectContaining({
        body: JSON.stringify({
          photoUrl: "https://x/diag.jpg",
          plantId: "plant-1",
          confirmNearLimit: true,
          soilTest: null,
        }),
      })
    );
  });

  it("includes the most recent soil test reading when running a diagnosis", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: DIAGNOSIS_RESULT }) });
    const user = userEvent.setup();
    render(<PlantDetailPage />);
    act(() => {
      subscriptions[0]?.onNext(plantSnapshot());
      subscriptions[1]?.onNext({ docs: [] });
      subscriptions[2]?.onNext({ docs: [] });
      subscriptions[3]?.onNext({
        docs: [
          {
            id: "test-1",
            data: () => ({ ph: 6.5, moistureLevel: 7, lightLevel: 5, occurredAt: ts(new Date("2026-06-25")) }),
          },
        ],
      });
      subscriptions[4]?.onNext({ docs: [] });
    });

    await user.click(screen.getByRole("button", { name: "Something looks wrong" }));
    await user.click(screen.getByRole("button", { name: "Fake diagnose upload" }));

    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/diagnose",
      expect.objectContaining({
        body: JSON.stringify({
          photoUrl: "https://x/diag.jpg",
          plantId: "plant-1",
          confirmNearLimit: false,
          soilTest: { ph: 6.5, moistureLevel: 7, lightLevel: 5 },
        }),
      })
    );
  });

  it("shows the full error via ErrorBlock when the Firestore plant subscription fails", () => {
    render(<PlantDetailPage />);
    act(() => {
      subscriptions[0]?.onError(new Error("Firestore permission denied"));
    });

    expect(screen.getByText("Firestore permission denied")).toBeInTheDocument();
  });
});
