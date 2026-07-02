import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CareStatusBadge } from "./CareStatusBadge";

describe("CareStatusBadge", () => {
  it("renders the label and 'OK' text with green styling for ok status", () => {
    render(<CareStatusBadge status="ok" label="Watering" />);
    const badge = screen.getByText("Watering: OK");
    expect(badge.className).toMatch(/green/);
  });

  it("renders 'Overdue' with red styling for overdue status", () => {
    render(<CareStatusBadge status="overdue" label="Watering" />);
    const badge = screen.getByText("Watering: Overdue");
    expect(badge.className).toMatch(/red/);
  });

  it("renders 'Not tracked' with neutral styling for not-tracked status", () => {
    render(<CareStatusBadge status="not-tracked" label="Misting" />);
    const badge = screen.getByText("Misting: Not tracked");
    expect(badge.className).toMatch(/gray/);
  });
});
