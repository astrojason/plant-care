import { describe, expect, it } from "vitest";
import type { CareTargets, LatestReading, Plant } from "../types/plant";
import { getReadingAlerts, getReadingOverride } from "./readings";
import { getCareTasks, getMostUrgentTask } from "./schedule";

const NOW = new Date("2026-07-10T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const TARGETS: CareTargets = {
  moisturePercent: { min: 30, max: 60 },
  nutrientPercent: { min: 20, max: null },
  lightLux: { min: 5000, max: 20000 },
  ph: { min: 6, max: 7 },
  ecUsCm: { min: null, max: 1500 },
};

function reading(overrides: Partial<LatestReading> = {}): LatestReading {
  return {
    ph: null,
    moisturePercent: null,
    nutrientPercent: null,
    lightLux: null,
    ecUsCm: null,
    tdsPpm: null,
    occurredAt: daysAgo(1),
    ...overrides,
  };
}

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "p1",
    nickname: "Test Plant",
    speciesCommonName: null,
    speciesScientificName: null,
    speciesConfidence: null,
    location: null,
    primaryPhotoUrl: "",
    wateringIntervalDays: 7,
    fertilizingIntervalDays: 30,
    mistingIntervalDays: null,
    targets: TARGETS,
    latestReading: null,
    lastWateredAt: daysAgo(3),
    lastFertilizedAt: daysAgo(3),
    lastMistedAt: null,
    createdAt: daysAgo(100),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

describe("getReadingAlerts", () => {
  it("flags low and high readings with a message naming the target", () => {
    const plant = makePlant({
      lastWateredAt: null,
      lastFertilizedAt: null,
      latestReading: reading({ moisturePercent: 12, lightLux: 900, ph: 7.8, ecUsCm: 2000, nutrientPercent: 50 }),
    });
    const alerts = getReadingAlerts(plant, NOW);

    expect(alerts.map((a) => [a.metric, a.level])).toEqual([
      ["moisturePercent", "low"],
      ["lightLux", "low"],
      ["ph", "high"],
      ["ecUsCm", "high"],
    ]);
    expect(alerts[0].message).toBe("Soil moisture 12% is below 30–60%");
    expect(alerts[1].message).toBe("Light 900 lux is below 5000–20000 lux");
  });

  it("returns nothing when there are no targets, no reading, or the reading is stale", () => {
    const low = reading({ moisturePercent: 5 });
    expect(getReadingAlerts(makePlant({ targets: null, latestReading: low }), NOW)).toEqual([]);
    expect(getReadingAlerts(makePlant({ latestReading: null }), NOW)).toEqual([]);
    expect(getReadingAlerts(makePlant({ latestReading: reading({ moisturePercent: 5, occurredAt: daysAgo(4) }) }), NOW)).toEqual([]);
  });

  it("drops a moisture alert once the plant has been watered since the reading", () => {
    const plant = makePlant({ latestReading: reading({ moisturePercent: 5, occurredAt: daysAgo(2) }), lastWateredAt: daysAgo(1) });
    expect(getReadingAlerts(plant, NOW)).toEqual([]);
  });
});

describe("getReadingOverride", () => {
  it("says watering is due when moisture is below target", () => {
    const plant = makePlant({ latestReading: reading({ moisturePercent: 12 }) });
    expect(getReadingOverride(plant, "watered", plant.lastWateredAt, NOW)).toEqual({
      kind: "due",
      reason: "Soil moisture 12% is below 30–60%",
    });
  });

  it("says watering is fine, until the reading goes stale, when moisture is in range", () => {
    const plant = makePlant({ latestReading: reading({ moisturePercent: 45, occurredAt: daysAgo(1) }) });
    expect(getReadingOverride(plant, "watered", plant.lastWateredAt, NOW)).toEqual({
      kind: "ok",
      until: new Date(daysAgo(1).getTime() + 3 * 24 * 60 * 60 * 1000),
    });
  });

  it("ignores a reading taken before the last time that care was done", () => {
    const plant = makePlant({ latestReading: reading({ moisturePercent: 5, occurredAt: daysAgo(2) }), lastWateredAt: daysAgo(1) });
    expect(getReadingOverride(plant, "watered", plant.lastWateredAt, NOW)).toBeNull();
  });

  it("uses nutrients for fertilizing and has nothing for misting", () => {
    const plant = makePlant({ latestReading: reading({ nutrientPercent: 5, moisturePercent: 5 }) });
    expect(getReadingOverride(plant, "fertilized", plant.lastFertilizedAt, NOW)?.kind).toBe("due");
    expect(getReadingOverride(plant, "misted", null, NOW)).toBeNull();
  });
});

describe("care tasks with readings", () => {
  it("makes watering due now on a low reading even though the interval says it isn't", () => {
    const plant = makePlant({ latestReading: reading({ moisturePercent: 12 }) });
    const tasks = getCareTasks([plant], NOW);
    const water = tasks.find((t) => t.careType === "watered");

    expect(water?.daysPastDue).toBe(0);
    expect(water?.reason).toBe("Soil moisture 12% is below 30–60%");
    expect(getMostUrgentTask(plant, NOW)).toMatchObject({ careType: "watered", reason: expect.any(String) });
  });

  it("surfaces watering for a plant with no watering interval when moisture is low", () => {
    const plant = makePlant({ wateringIntervalDays: null, latestReading: reading({ moisturePercent: 12 }) });
    expect(getCareTasks([plant], NOW).some((t) => t.careType === "watered")).toBe(true);
  });

  it("holds off an overdue watering while a fresh reading says moisture is fine", () => {
    const plant = makePlant({ lastWateredAt: daysAgo(10), latestReading: reading({ moisturePercent: 45, occurredAt: daysAgo(1) }) });
    const water = getCareTasks([plant], NOW).find((t) => t.careType === "watered");

    expect(water!.daysPastDue).toBeLessThan(0);
    expect(water!.reason).toBeNull();
  });

  it("falls back to the schedule once the reading is stale", () => {
    const plant = makePlant({ lastWateredAt: daysAgo(10), latestReading: reading({ moisturePercent: 45, occurredAt: daysAgo(5) }) });
    const water = getCareTasks([plant], NOW).find((t) => t.careType === "watered");

    expect(water!.daysPastDue).toBeGreaterThan(0);
  });

  it("keeps the schedule's overdue days when a low reading agrees with it", () => {
    const plant = makePlant({ lastWateredAt: daysAgo(10), latestReading: reading({ moisturePercent: 12 }) });
    const water = getCareTasks([plant], NOW).find((t) => t.careType === "watered");

    expect(water!.daysPastDue).toBeCloseTo(3, 5);
    expect(water!.reason).not.toBeNull();
  });
});
