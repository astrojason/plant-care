import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DiagnosisResult } from "@/lib/openai/schemas";
import { DiagnosisSheet } from "./DiagnosisSheet";

vi.mock("./PhotoUploader", () => ({
  PhotoUploader: ({ onUploaded }: { onUploaded: (p: { storagePath: string; downloadUrl: string }) => void }) => (
    <button type="button" onClick={() => onUploaded({ storagePath: "p/x.jpg", downloadUrl: "https://x/photo.jpg" })}>
      Fake upload
    </button>
  ),
}));

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
    treatment_steps: null,
    follow_up_days: null,
    schedule_adjustment: null,
    ...overrides,
  };
}

function renderSheet(overrides: Partial<Parameters<typeof DiagnosisSheet>[0]> = {}) {
  return render(
    <DiagnosisSheet
      plantName="Fig Newton"
      pathPrefix="users/u1/plants/p1"
      photoUrl="https://x/photo.jpg"
      diagnosing={false}
      result={makeResult()}
      saving={false}
      saved={false}
      onPhotoUploaded={vi.fn()}
      onClose={vi.fn()}
      onSave={vi.fn()}
      {...overrides}
    />
  );
}

describe("DiagnosisSheet", () => {
  it("prompts for a photo when there's no result yet", () => {
    renderSheet({ result: null, photoUrl: null });

    expect(screen.getByText(/take a photo of what's wrong/i)).toBeInTheDocument();
    expect(screen.getByText("Fake upload")).toBeInTheDocument();
  });

  it("calls onPhotoUploaded when a photo is picked in the upload state", async () => {
    const onPhotoUploaded = vi.fn();
    const user = userEvent.setup();
    renderSheet({ result: null, photoUrl: null, onPhotoUploaded });

    await user.click(screen.getByText("Fake upload"));

    expect(onPhotoUploaded).toHaveBeenCalledWith({ storagePath: "p/x.jpg", downloadUrl: "https://x/photo.jpg" });
  });

  it("shows a reading-the-photo indicator while diagnosing", () => {
    renderSheet({ result: null, diagnosing: true });

    expect(screen.getByText(/reading the photo/i)).toBeInTheDocument();
    expect(screen.queryByText("Fake upload")).not.toBeInTheDocument();
  });

  it("renders the plant name, assessment, and urgency as a timeframe", () => {
    renderSheet();

    expect(screen.getByText("Fig Newton · diagnosis")).toBeInTheDocument();
    expect(screen.getByText("Leaves show signs of overwatering.")).toBeInTheDocument();
    expect(screen.getByText("Needs attention this week")).toBeInTheDocument();
  });

  it("renders each detected issue with its confidence and symptoms", () => {
    renderSheet();

    expect(screen.getByText("Overwatering")).toBeInTheDocument();
    expect(screen.getByText("75% confident")).toBeInTheDocument();
    expect(screen.getByText("Yellowing leaves · Soft stems")).toBeInTheDocument();
  });

  it("falls back to a single numbered step from suggested_treatment when treatment_steps is absent", () => {
    renderSheet();

    expect(screen.getByText("Let the soil dry out between waterings.")).toBeInTheDocument();
  });

  it("renders structured treatment_steps when present", () => {
    renderSheet({
      result: makeResult({
        treatment_steps: [
          { action: "Move to indirect light", timing: "Today" },
          { action: "Check soil moisture", timing: "In 3 days" },
        ],
      }),
    });

    expect(screen.getByText("Move to indirect light")).toBeInTheDocument();
    expect(screen.getByText("Check soil moisture")).toBeInTheDocument();
  });

  it("defaults the follow-up to 7 days when follow_up_days is absent", () => {
    renderSheet();

    expect(screen.getByText(/7 days/)).toBeInTheDocument();
  });

  it("uses follow_up_days when present", () => {
    renderSheet({ result: makeResult({ follow_up_days: 3 }) });

    expect(screen.getByText(/3 days/)).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onClose });

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSave when 'Save to plant' is clicked", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onSave });

    await user.click(screen.getByRole("button", { name: "Save to plant" }));

    expect(onSave).toHaveBeenCalled();
  });

  it("always surfaces the not-a-substitute-for-a-specialist disclaimer", () => {
    renderSheet();

    expect(screen.getByText(/specialist/i)).toBeInTheDocument();
  });

  it("handles an empty detected_issues list (healthy plant)", () => {
    renderSheet({ result: makeResult({ detected_issues: [] }) });

    expect(screen.queryByText("Overwatering")).not.toBeInTheDocument();
    expect(screen.getByText(/looks healthy/i)).toBeInTheDocument();
  });
});
