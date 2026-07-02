import type { CareStatus, Plant } from "../types/plant";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A plant tracked but never done (`lastDone === null`) is treated as
 * overdue immediately — it needs the action, not a grace period.
 */
export function getCareStatus(
  lastDone: Date | null,
  intervalDays: number | null,
  now: Date = new Date()
): CareStatus {
  if (intervalDays === null || intervalDays === undefined) return "not-tracked";
  if (lastDone === null) return "overdue";

  const dueAt = lastDone.getTime() + intervalDays * DAY_MS;
  return now.getTime() >= dueAt ? "overdue" : "ok";
}

/**
 * Days past due for a single care type. Positive = overdue by that many
 * days, negative = not yet due, null = not tracked. Used only to rank
 * urgency for sorting, not displayed directly.
 */
function daysPastDue(lastDone: Date | null, intervalDays: number | null, now: Date): number | null {
  if (intervalDays === null || intervalDays === undefined) return null;
  const reference = lastDone ? lastDone.getTime() : -Infinity;
  const dueAt = reference + intervalDays * DAY_MS;
  return (now.getTime() - dueAt) / DAY_MS;
}

function maxDaysPastDue(plant: Plant, now: Date): number {
  const values = [
    daysPastDue(plant.lastWateredAt, plant.wateringIntervalDays, now),
    daysPastDue(plant.lastFertilizedAt, plant.fertilizingIntervalDays, now),
    daysPastDue(plant.lastMistedAt, plant.mistingIntervalDays, now),
  ].filter((v): v is number => v !== null);

  return values.length > 0 ? Math.max(...values) : -Infinity;
}

/**
 * Comparator for Array.prototype.sort: most-overdue plants first, plants
 * with no tracked care schedule last.
 */
export function compareByUrgency(a: Plant, b: Plant, now: Date = new Date()): number {
  return maxDaysPastDue(b, now) - maxDaysPastDue(a, now);
}
