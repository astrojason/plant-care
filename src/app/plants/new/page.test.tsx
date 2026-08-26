import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetIdToken = vi.fn().mockResolvedValue("fake-id-token");
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "user-1", getIdToken: mockGetIdToken },
    loading: false,
  }),
}));

vi.mock("@/components/PhotoUploader", () => ({
  PhotoUploader: ({ onUploaded }: { onUploaded: (p: { storagePath: string; downloadUrl: string }) => void }) => (
    <button
      type="button"
      onClick={() => onUploaded({ storagePath: "users/user-1/plants/temp/x.jpg", downloadUrl: "https://x/photo.jpg" })}
    >
      Fake upload
    </button>
  ),
}));

const mockCreatePlant = vi.fn();
vi.mock("@/lib/firestore/plants", () => ({
  createPlant: (...args: unknown[]) => mockCreatePlant(...args),
}));

const mockAddPlantPhoto = vi.fn();
vi.mock("@/lib/firestore/photos", () => ({
  addPlantPhoto: (...args: unknown[]) => mockAddPlantPhoto(...args),
}));

const mockReplace = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  usePathname: () => "/plants/new",
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __collection: true })),
  onSnapshot: vi.fn(() => vi.fn()),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { default: AddPlantPage } = await import("./page");

const IDENTIFICATION_RESULT = {
  species_common_name: "Fiddle Leaf Fig",
  species_scientific_name: "Ficus lyrata",
  confidence: 0.9,
  care_summary: { light: "Bright", water_frequency_guidance: "Weekly", humidity: "Moderate", notes: "" },
  suggested_watering_interval_days: 7,
  suggested_fertilizing_interval_days: 30,
  suggested_misting_interval_days: 3,
};

beforeEach(() => {
  mockFetch.mockReset();
  mockCreatePlant.mockReset();
  mockAddPlantPhoto.mockReset();
  mockReplace.mockReset();
  mockGetIdToken.mockClear();
});

describe("AddPlantPage", () => {
  it("calls /api/identify with the auth token after a photo is uploaded", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: IDENTIFICATION_RESULT }) });
    const user = userEvent.setup();
    render(<AddPlantPage />);

    await user.click(screen.getByRole("button", { name: "Fake upload" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/identify",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer fake-id-token" }),
      })
    );
  });

  it("renders the identification result once the API call succeeds", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: IDENTIFICATION_RESULT }) });
    const user = userEvent.setup();
    render(<AddPlantPage />);

    await user.click(screen.getByRole("button", { name: "Fake upload" }));

    expect(await screen.findByRole("button", { name: /save plant/i })).toBeInTheDocument();
  });

  it("shows the full error via ErrorBlock when the identify call fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: { message: "OpenAI request failed: 502 Bad Gateway" } }),
    });
    const user = userEvent.setup();
    render(<AddPlantPage />);

    await user.click(screen.getByRole("button", { name: "Fake upload" }));

    expect(await screen.findByText("OpenAI request failed: 502 Bad Gateway")).toBeInTheDocument();
  });

  it("shows a confirm dialog and resubmits with confirmNearLimit when near the token limit", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requiresConfirmation: true, tokensUsed: 226000, dailyLimit: 250000 }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: IDENTIFICATION_RESULT }) });
    const user = userEvent.setup();
    render(<AddPlantPage />);

    await user.click(screen.getByRole("button", { name: "Fake upload" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/226,000/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /proceed/i }));

    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/identify",
      expect.objectContaining({
        body: JSON.stringify({ photoUrl: "https://x/photo.jpg", confirmNearLimit: true }),
      })
    );
    expect(await screen.findByRole("button", { name: /save plant/i })).toBeInTheDocument();
  });

  it("creates the plant and redirects to its detail page on save", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: IDENTIFICATION_RESULT }) });
    mockCreatePlant.mockResolvedValue("new-plant-id");
    const user = userEvent.setup();
    render(<AddPlantPage />);

    await user.click(screen.getByRole("button", { name: "Fake upload" }));
    await screen.findByRole("button", { name: /save plant/i });
    await user.click(screen.getByRole("button", { name: /save plant/i }));

    expect(mockCreatePlant).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        primaryPhotoUrl: "https://x/photo.jpg",
        speciesCommonName: "Fiddle Leaf Fig",
      })
    );
    expect(mockAddPlantPhoto).toHaveBeenCalledWith(
      "user-1",
      "new-plant-id",
      "users/user-1/plants/temp/x.jpg",
      "https://x/photo.jpg",
      "identification"
    );
    expect(mockReplace).toHaveBeenCalledWith("/plants/new-plant-id");
  });
});
