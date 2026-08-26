import { describe, expect, it } from "vitest";
import type { Plant } from "../types/plant";
import { compareByUrgency, getCareStatus, getCareTasks, getMostUrgentTask } from "./schedule";

const NOW = new Date("2026-07-01T12:00:00Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("getCareStatus", () => {
  it("returns 'not-tracked' when no interval is set", () => {
    expect(getCareStatus(daysAgo(100), null, NOW)).toBe("not-tracked");
  });

  it("returns 'ok' when last done recently, within the interval", () => {
    expect(getCareStatus(daysAgo(2), 7, NOW)).toBe("ok");
  });

  it("returns 'overdue' when last done exactly at the interval boundary", () => {
    expect(getCareStatus(daysAgo(7), 7, NOW)).toBe("overdue");
  });

  it("returns 'overdue' when last done well past the interval", () => {
    expect(getCareStatus(daysAgo(10), 7, NOW)).toBe("overdue");
  });

  it("returns 'overdue' when tracked but never done", () => {
    expect(getCareStatus(null, 7, NOW)).toBe("overdue");
  });

  it("returns 'ok' just under the interval boundary", () => {
    expect(getCareStatus(daysAgo(6.9), 7, NOW)).toBe("ok");
  });
});

function makePlant(overrides: Partial<Plant>): Plant {
  return {
    id: "p1",
    nickname: "Test Plant",
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

describe("compareByUrgency", () => {
  it("sorts more-overdue plants before less-overdue plants", () => {
    const barelyOverdue = makePlant({
      id: "barely",
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(7.5),
    });
    const veryOverdue = makePlant({
      id: "very",
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(20),
    });

    const sorted = [barelyOverdue, veryOverdue].sort((a, b) => compareByUrgency(a, b, NOW));

    expect(sorted.map((p) => p.id)).toEqual(["very", "barely"]);
  });

  it("sorts overdue plants before ok plants", () => {
    const ok = makePlant({ id: "ok", wateringIntervalDays: 7, lastWateredAt: daysAgo(1) });
    const overdue = makePlant({ id: "overdue", wateringIntervalDays: 7, lastWateredAt: daysAgo(10) });

    const sorted = [ok, overdue].sort((a, b) => compareByUrgency(a, b, NOW));

    expect(sorted.map((p) => p.id)).toEqual(["overdue", "ok"]);
  });

  it("sorts not-tracked plants last", () => {
    const notTracked = makePlant({ id: "not-tracked" });
    const ok = makePlant({ id: "ok", wateringIntervalDays: 7, lastWateredAt: daysAgo(1) });
    const overdue = makePlant({ id: "overdue", wateringIntervalDays: 7, lastWateredAt: daysAgo(10) });

    const sorted = [notTracked, ok, overdue].sort((a, b) => compareByUrgency(a, b, NOW));

    expect(sorted.map((p) => p.id)).toEqual(["overdue", "ok", "not-tracked"]);
  });

  it("considers all three care types, using the most overdue one", () => {
    const overdueOnMisting = makePlant({
      id: "misting-overdue",
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(1),
      mistingIntervalDays: 3,
      lastMistedAt: daysAgo(30),
    });
    const ok = makePlant({ id: "ok", wateringIntervalDays: 7, lastWateredAt: daysAgo(1) });

    const sorted = [ok, overdueOnMisting].sort((a, b) => compareByUrgency(a, b, NOW));

    expect(sorted.map((p) => p.id)).toEqual(["misting-overdue", "ok"]);
  });
});

describe("getCareTasks", () => {
  it("flattens each tracked, due-or-recent care type into its own task", () => {
    const plant = makePlant({
      id: "p1",
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(10),
      fertilizingIntervalDays: 30,
      lastFertilizedAt: daysAgo(1),
      mistingIntervalDays: null,
    });

    const tasks = getCareTasks([plant], NOW);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ plant, careType: "watered" });
    expect(tasks[0].daysPastDue).toBeCloseTo(3, 5);
  });

  it("excludes tasks not due within the last week (daysPastDue <= -7)", () => {
    const plant = makePlant({
      id: "p1",
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(0),
    });

    expect(getCareTasks([plant], NOW)).toHaveLength(0);
  });

  it("includes tasks due within the coming week, for 'Later this week'", () => {
    const plant = makePlant({
      id: "p1",
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(3),
    });

    const tasks = getCareTasks([plant], NOW);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].daysPastDue).toBeLessThan(0);
    expect(tasks[0].daysPastDue).toBeGreaterThan(-7);
  });

  it("treats a tracked-but-never-done care type as maximally overdue", () => {
    const plant = makePlant({ id: "p1", wateringIntervalDays: 7, lastWateredAt: null });

    const tasks = getCareTasks([plant], NOW);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].daysPastDue).toBe(Infinity);
  });

  it("sorts tasks most-overdue first, across plants and care types", () => {
    const plantA = makePlant({
      id: "a",
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(9),
    });
    const plantB = makePlant({
      id: "b",
      fertilizingIntervalDays: 30,
      lastFertilizedAt: daysAgo(40),
    });

    const tasks = getCareTasks([plantA, plantB], NOW);

    expect(tasks.map((t) => t.plant.id)).toEqual(["b", "a"]);
  });
});

describe("getMostUrgentTask", () => {
  it("returns null when nothing is tracked", () => {
    expect(getMostUrgentTask(makePlant({}), NOW)).toBeNull();
  });

  it("picks the most-overdue tracked care type", () => {
    const plant = makePlant({
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(9),
      fertilizingIntervalDays: 30,
      lastFertilizedAt: daysAgo(40),
    });

    expect(getMostUrgentTask(plant, NOW)?.careType).toBe("fertilized");
  });

  it("picks the soonest-due tracked care type when nothing is overdue", () => {
    const plant = makePlant({
      wateringIntervalDays: 7,
      lastWateredAt: daysAgo(1), // due in 6 days
      fertilizingIntervalDays: 30,
      lastFertilizedAt: daysAgo(29), // due in 1 day
    });

    expect(getMostUrgentTask(plant, NOW)?.careType).toBe("fertilized");
  });
});
