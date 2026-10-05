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
const mockUpdateCareTargets = vi.fn();
vi.mock("@/lib/firestore/plants", () => ({
  deletePlant: (...args: unknown[]) => mockDeletePlant(...args),
  updatePlantSpecies: (...args: unknown[]) => mockUpdatePlantSpecies(...args),
  updateCareSchedule: (...args: unknown[]) => mockUpdateCareSchedule(...args),
  updateCareTargets: (...args: unknown[]) => mockUpdateCareTargets(...args),
}));

const mockAddPlantPhoto = vi.fn();
vi.mock("@/lib/firestore/photos", () => ({
  addPlantPhoto: (...args: unknown[]) => mockAddPlantPhoto(...args),
}));

const mockCreateDiagnosis = vi.fn();
const mockDeleteDiagnosis = vi.fn();
vi.mock("@/lib/firestore/diagnoses", () => ({
  createDiagnosis: (...args: unknown[]) => mockCreateDiagnosis(...args),
  deleteDiagnosis: (...args: unknown[]) => mockDeleteDiagnosis(...args),
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
  mockUpdateCareTargets.mockReset();
  mockAddPlantPhoto.mockReset();
  mockCreateDiagnosis.mockReset();
  mockDeleteDiagnosis.mockReset();
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

  it("fetches recommended intervals for the saved species and applies them", async () => {
    mockUpdateCareSchedule.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          species_common_name: "Fiddle Leaf Fig",
          species_scientific_name: "Ficus lyrata",
          confidence: 1,
          care_summary: { light: "", water_frequency_guidance: "", humidity: "", notes: "" },
          suggested_watering_interval_days: 10,
          suggested_fertilizing_interval_days: 45,
          suggested_misting_interval_days: 4,
          suggested_targets: {
            moisture_min_percent: 30,
            moisture_max_percent: 60,
            nutrient_min_percent: null,
            nutrient_max_percent: null,
            light_min_lux: 5000,
            light_max_lux: null,
            ph_min: 6,
            ph_max: 7,
            ec_max_us_cm: 1500,
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Update recommended schedule" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/identify",
      expect.objectContaining({
        body: JSON.stringify({
          photoUrl: "https://x/y.jpg",
          confirmNearLimit: false,
          speciesName: "Ficus lyrata",
        }),
      })
    );
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(mockUpdateCareSchedule).toHaveBeenCalledWith("user-1", "plant-1", {
      wateringIntervalDays: 10,
      fertilizingIntervalDays: 45,
      mistingIntervalDays: 4,
    });
    expect(mockUpdateCareTargets).toHaveBeenCalledWith("user-1", "plant-1", {
      moisturePercent: { min: 30, max: 60 },
      nutrientPercent: null,
      lightLux: { min: 5000, max: null },
      ph: { min: 6, max: 7 },
      ecUsCm: { min: null, max: 1500 },
    });
  });

  it("sends the latest soil reading when refreshing the recommended schedule", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: {} }) });
    const user = userEvent.setup();
    render(<PlantDetailPage />);
    act(() => {
      subscriptions[0]?.onNext(plantSnapshot());
      subscriptions[1]?.onNext({ docs: [] });
      subscriptions[2]?.onNext({ docs: [] });
      subscriptions[3]?.onNext({
        docs: [{ id: "test-1", data: () => ({ moisturePercent: 12, occurredAt: ts(new Date("2026-06-25")) }) }],
      });
      subscriptions[4]?.onNext({ docs: [] });
    });

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Update recommended schedule" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/identify",
      expect.objectContaining({
        body: JSON.stringify({
          photoUrl: "https://x/y.jpg",
          confirmNearLimit: false,
          speciesName: "Ficus lyrata",
          soilTest: { ph: null, moisturePercent: 12, nutrientPercent: null, lightLux: null, ecUsCm: null, tdsPpm: null },
        }),
      })
    );
  });

  it("saves edited target ranges", async () => {
    mockUpdateCareTargets.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Edit targets" }));
    await user.type(screen.getByLabelText("Moisture (%) min"), "30");
    await user.type(screen.getByLabelText("Moisture (%) max"), "60");
    await user.type(screen.getByLabelText("EC (µS/cm) max"), "1500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdateCareTargets).toHaveBeenCalledWith("user-1", "plant-1", {
      moisturePercent: { min: 30, max: 60 },
      nutrientPercent: null,
      lightLux: null,
      ph: null,
      ecUsCm: { min: null, max: 1500 },
    });
  });

  it("logs a soil test with soil, light, and water readings from the overflow menu's sheet", async () => {
    mockAddSoilTest.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("button", { name: "Log soil test" }));
    await user.type(screen.getByLabelText("pH"), "6.5");
    await user.type(screen.getByLabelText("Moisture (%)"), "40");
    await user.type(screen.getByLabelText("Nutrients (%)"), "30");
    await user.type(screen.getByLabelText("Light (lux)"), "5000");
    await user.type(screen.getByLabelText("EC (µS/cm)"), "800");
    await user.type(screen.getByLabelText("TDS (ppm)"), "400");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockAddSoilTest).toHaveBeenCalledWith("user-1", "plant-1", {
      ph: 6.5,
      moisturePercent: 40,
      nutrientPercent: 30,
      lightLux: 5000,
      ecUsCm: 800,
      tdsPpm: 400,
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
            data: () => ({ ph: 6.5, moisturePercent: 40, lightLux: 5000, occurredAt: ts(new Date("2026-06-25")) }),
          },
        ],
      });
      subscriptions[4]?.onNext({ docs: [] });
    });

    await user.click(screen.getByRole("button", { name: "Delete soil test" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockDeleteSoilTest).toHaveBeenCalledWith("user-1", "plant-1", "test-1");
  });

  it("deletes a diagnosis from history after confirmation", async () => {
    mockDeleteDiagnosis.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PlantDetailPage />);
    act(() => {
      subscriptions[0]?.onNext(plantSnapshot());
      subscriptions[1]?.onNext({ docs: [] });
      subscriptions[2]?.onNext({
        docs: [
          {
            id: "diag-1",
            data: () => ({
              photoId: "photo-1",
              detectedIssues: [{ issue: "Overwatering", confidence: 0.7, symptomsObserved: ["Yellowing leaves"] }],
              suggestedTreatment: "Water less often.",
              urgency: "medium",
              createdAt: ts(new Date("2026-06-25")),
            }),
          },
        ],
      });
      subscriptions[3]?.onNext({ docs: [] });
      subscriptions[4]?.onNext({ docs: [] });
    });

    await user.click(screen.getByRole("button", { name: "Delete diagnosis" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockDeleteDiagnosis).toHaveBeenCalledWith("user-1", "plant-1", "diag-1");
  });

  it("opens a saved diagnosis from history in a read-only sheet", async () => {
    const user = userEvent.setup();
    render(<PlantDetailPage />);
    act(() => {
      subscriptions[0]?.onNext(plantSnapshot());
      subscriptions[1]?.onNext({ docs: [] });
      subscriptions[2]?.onNext({
        docs: [
          {
            id: "diag-1",
            data: () => ({
              photoId: null,
              detectedIssues: [],
              suggestedTreatment: "Water more consistently.",
              urgency: "low",
              rawAiResponse: DIAGNOSIS_RESULT,
              createdAt: ts(new Date("2026-06-25")),
            }),
          },
        ],
      });
      subscriptions[3]?.onNext({ docs: [] });
      subscriptions[4]?.onNext({ docs: [] });
    });

    await user.click(screen.getByRole("button", { name: "Diagnosis" }));

    expect(screen.getByText("Looks a bit thirsty.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save to plant|saved/i })).not.toBeInTheDocument();
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

  it("applies a diagnosis's suggested schedule adjustment to the care plan on save", async () => {
    const resultWithAdjustment = {
      ...DIAGNOSIS_RESULT,
      schedule_adjustment: {
        care_type: "watering" as const,
        suggested_interval_days: 12,
        reason: "Overwatering detected.",
      },
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: resultWithAdjustment }) });
    mockAddPlantPhoto.mockResolvedValue("photo-1");
    mockCreateDiagnosis.mockResolvedValue(undefined);
    mockUpdateCareSchedule.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAndLoadPlant();

    await user.click(screen.getByRole("button", { name: "Something looks wrong" }));
    await user.click(screen.getByRole("button", { name: "Fake diagnose upload" }));
    await screen.findByText(/will change to every/i);

    await user.click(screen.getByRole("button", { name: "Save to plant" }));

    expect(mockUpdateCareSchedule).toHaveBeenCalledWith("user-1", "plant-1", {
      wateringIntervalDays: 12,
      fertilizingIntervalDays: 30,
      mistingIntervalDays: null,
    });
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
            data: () => ({ ph: 6.5, moisturePercent: 40, lightLux: 5000, occurredAt: ts(new Date("2026-06-25")) }),
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
          soilTest: { ph: 6.5, moisturePercent: 40, nutrientPercent: null, lightLux: 5000, ecUsCm: null, tdsPpm: null },
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
