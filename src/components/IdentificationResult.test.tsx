import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { IdentificationResult } from "@/lib/openai/schemas";
import { IdentificationResultView } from "./IdentificationResult";

function makeResult(overrides: Partial<IdentificationResult> = {}): IdentificationResult {
  return {
    species_common_name: "Fiddle Leaf Fig",
    species_scientific_name: "Ficus lyrata",
    confidence: 0.9,
    care_summary: {
      light: "Bright, indirect",
      water_frequency_guidance: "Weekly",
      humidity: "Moderate",
      notes: "",
    },
    suggested_watering_interval_days: 7,
    suggested_fertilizing_interval_days: 30,
    suggested_misting_interval_days: 3,
    ...overrides,
  };
}

describe("IdentificationResultView", () => {
  it("shows a low-confidence warning banner when confidence is below threshold", () => {
    render(<IdentificationResultView result={makeResult({ confidence: 0.2 })} onConfirm={vi.fn()} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not show a warning banner when confidence is high", () => {
    render(<IdentificationResultView result={makeResult({ confidence: 0.9 })} onConfirm={vi.fn()} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("pre-fills fields from the identification result", () => {
    render(<IdentificationResultView result={makeResult()} onConfirm={vi.fn()} />);

    expect(screen.getByLabelText(/common name/i)).toHaveValue("Fiddle Leaf Fig");
    expect(screen.getByLabelText(/scientific name/i)).toHaveValue("Ficus lyrata");
    expect(screen.getByLabelText(/water \(days\)/i)).toHaveValue(7);
  });

  it("never blocks saving, even at very low confidence", () => {
    render(<IdentificationResultView result={makeResult({ confidence: 0.05 })} onConfirm={vi.fn()} />);

    expect(screen.getByRole("button", { name: /save plant/i })).toBeEnabled();
  });

  it("calls onConfirm with the edited values, including manual overrides", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<IdentificationResultView result={makeResult()} onConfirm={onConfirm} />);

    await user.clear(screen.getByLabelText(/nickname/i));
    await user.type(screen.getByLabelText(/nickname/i), "Big Fig");
    await user.click(screen.getByRole("button", { name: /save plant/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        nickname: "Big Fig",
        speciesCommonName: "Fiddle Leaf Fig",
        wateringIntervalDays: 7,
      })
    );
  });
});
