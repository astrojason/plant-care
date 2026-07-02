import { describe, expect, it } from "vitest";
import { computeLastDoneAfterDelete } from "./log";

describe("computeLastDoneAfterDelete", () => {
  it("returns null when no events of the given type remain", () => {
    const result = computeLastDoneAfterDelete(
      [{ eventType: "fertilized", occurredAt: new Date("2026-06-01") }],
      "watered"
    );

    expect(result).toBeNull();
  });

  it("returns the occurredAt of the single remaining event of that type", () => {
    const date = new Date("2026-06-01T10:00:00Z");
    const result = computeLastDoneAfterDelete([{ eventType: "watered", occurredAt: date }], "watered");

    expect(result).toEqual(date);
  });

  it("returns the most recent occurredAt among multiple remaining events of that type", () => {
    const older = new Date("2026-06-01T10:00:00Z");
    const newer = new Date("2026-06-10T10:00:00Z");
    const result = computeLastDoneAfterDelete(
      [
        { eventType: "watered", occurredAt: older },
        { eventType: "watered", occurredAt: newer },
        { eventType: "misted", occurredAt: new Date("2026-06-15") },
      ],
      "watered"
    );

    expect(result).toEqual(newer);
  });

  it("ignores events of other types entirely", () => {
    const result = computeLastDoneAfterDelete(
      [
        { eventType: "fertilized", occurredAt: new Date("2026-06-01") },
        { eventType: "misted", occurredAt: new Date("2026-06-02") },
      ],
      "watered"
    );

    expect(result).toBeNull();
  });
});
