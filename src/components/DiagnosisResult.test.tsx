import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DiagnosisResult } from "@/lib/openai/schemas";
import { DiagnosisResultView } from "./DiagnosisResult";

function makeResult(overrides: Partial<DiagnosisResult> = {}): DiagnosisResult {
  return {
    overall_assessment: "Leaves show signs of overwatering.",
    detected_issues: [
      {
        issue: "Overwatering",
        confidence: 0.75,
        symptoms_observed: ["Yellowing leaves", "Soft stems"],
      },
    ],
    suggested_treatment: "Let the soil dry out between waterings.",
    urgency: "medium",
    ...overrides,
  };
}

describe("DiagnosisResultView", () => {
  it("renders the overall assessment and suggested treatment", () => {
    render(<DiagnosisResultView result={makeResult()} />);

    expect(screen.getByText("Leaves show signs of overwatering.")).toBeInTheDocument();
    expect(screen.getByText("Let the soil dry out between waterings.")).toBeInTheDocument();
  });

  it("renders each detected issue with its symptoms", () => {
    render(<DiagnosisResultView result={makeResult()} />);

    expect(screen.getByText(/Overwatering/)).toBeInTheDocument();
    expect(screen.getByText("Yellowing leaves")).toBeInTheDocument();
    expect(screen.getByText("Soft stems")).toBeInTheDocument();
  });

  it("renders the urgency badge", () => {
    render(<DiagnosisResultView result={makeResult({ urgency: "high" })} />);

    expect(screen.getByText(/Urgency: high/)).toBeInTheDocument();
  });

  it("handles an empty detected_issues list (healthy plant)", () => {
    render(<DiagnosisResultView result={makeResult({ detected_issues: [] })} />);

    expect(screen.queryByText(/Overwatering/)).not.toBeInTheDocument();
  });

  it("always surfaces the not-a-substitute-for-professional-diagnosis disclaimer", () => {
    render(<DiagnosisResultView result={makeResult()} />);

    expect(screen.getByText(/not a substitute for professional/i)).toBeInTheDocument();
  });
});
