import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Plant } from "@/lib/types/plant";
import { CareEventButtons } from "./CareEventButtons";

const NOW = new Date("2026-07-01T12:00:00Z");

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "plant-1",
    nickname: "Fig Newton",
    speciesCommonName: null,
    speciesScientificName: null,
    speciesConfidence: null,
    location: null,
    primaryPhotoUrl: "",
    wateringIntervalDays: null,
    fertilizingIntervalDays: null,
    mistingIntervalDays: null,
    lastWateredAt: null,
    lastFertilizedAt: null,
    lastMistedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("CareEventButtons", () => {
  it("calls onLog with 'watered' when the Water button is clicked", async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CareEventButtons plant={makePlant()} now={NOW} onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Water" }));

    expect(onLog).toHaveBeenCalledWith("watered");
  });

  it("calls onLog with 'fertilized' and 'misted' for the other buttons", async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CareEventButtons plant={makePlant()} now={NOW} onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Fertilize" }));
    await user.click(screen.getByRole("button", { name: "Mist" }));

    expect(onLog).toHaveBeenNthCalledWith(1, "fertilized");
    expect(onLog).toHaveBeenNthCalledWith(2, "misted");
  });

  it("disables all buttons while a log action is pending", async () => {
    let resolveLog: () => void = () => {};
    const onLog = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLog = resolve;
        })
    );
    const user = userEvent.setup();
    render(<CareEventButtons plant={makePlant()} now={NOW} onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Water" }));

    expect(screen.getByRole("button", { name: "Fertilize" })).toBeDisabled();
    resolveLog();
  });

  it("shows the full error via ErrorBlock when logging fails", async () => {
    const onLog = vi.fn().mockRejectedValue(new Error("Firestore write failed"));
    const user = userEvent.setup();
    render(<CareEventButtons plant={makePlant()} now={NOW} onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Water" }));

    expect(await screen.findByText("Firestore write failed")).toBeInTheDocument();
  });

  it("emphasizes the most-overdue tracked care type", async () => {
    const plant = makePlant({
      wateringIntervalDays: 7,
      lastWateredAt: new Date("2026-06-20T00:00:00Z"), // 4 days overdue
      fertilizingIntervalDays: 30,
      lastFertilizedAt: new Date("2026-06-28T00:00:00Z"), // not yet due
    });
    render(<CareEventButtons plant={plant} now={NOW} onLog={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Water" }).className).toContain("btn-primary");
    expect(screen.getByRole("button", { name: "Fertilize" }).className).toContain("btn-secondary");
  });

  it("emphasizes nothing when no care type is tracked", () => {
    render(<CareEventButtons plant={makePlant()} now={NOW} onLog={vi.fn()} />);

    for (const label of ["Water", "Fertilize", "Mist"]) {
      expect(screen.getByRole("button", { name: label }).className).toContain("btn-secondary");
    }
  });
});
