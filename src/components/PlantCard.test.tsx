import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Plant } from "@/lib/types/plant";
import { PlantCard } from "./PlantCard";

const NOW = new Date("2026-07-01T12:00:00Z");

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "plant-1",
    nickname: "Fig Newton",
    speciesCommonName: "Fiddle Leaf Fig",
    speciesScientificName: "Ficus lyrata",
    speciesConfidence: 0.9,
    location: "Living room",
    primaryPhotoUrl: "https://example.com/photo.jpg",
    wateringIntervalDays: 7,
    fertilizingIntervalDays: 30,
    mistingIntervalDays: null,
    lastWateredAt: new Date("2026-06-25T00:00:00Z"),
    lastFertilizedAt: new Date("2026-05-01T00:00:00Z"),
    lastMistedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("PlantCard", () => {
  it("renders the nickname and species", () => {
    render(<PlantCard plant={makePlant()} now={NOW} />);

    expect(screen.getByText("Fig Newton")).toBeInTheDocument();
    expect(screen.getByText("Fiddle Leaf Fig")).toBeInTheDocument();
  });

  it("links to the plant detail page", () => {
    render(<PlantCard plant={makePlant()} now={NOW} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/plants/plant-1");
  });

  it("shows a watering-overdue badge when the interval has passed", () => {
    render(
      <PlantCard
        plant={makePlant({ lastWateredAt: new Date("2026-06-01T00:00:00Z") })}
        now={NOW}
      />
    );

    expect(screen.getByText("Water: Overdue")).toBeInTheDocument();
  });

  it("shows a watering-OK badge when within the interval", () => {
    render(<PlantCard plant={makePlant()} now={NOW} />);

    expect(screen.getByText("Water: OK")).toBeInTheDocument();
  });

  it("shows a fertilizing-overdue badge and a not-tracked misting badge", () => {
    render(<PlantCard plant={makePlant()} now={NOW} />);

    expect(screen.getByText("Fertilize: Overdue")).toBeInTheDocument();
    expect(screen.getByText("Mist: Not tracked")).toBeInTheDocument();
  });

  it("omits the species line when species is unknown", () => {
    render(<PlantCard plant={makePlant({ speciesCommonName: null })} now={NOW} />);

    expect(screen.queryByText("Fiddle Leaf Fig")).not.toBeInTheDocument();
  });
});
