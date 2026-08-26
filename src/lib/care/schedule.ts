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
 * days, negative = not yet due, null = not tracked. Also used to rank
 * urgency for sorting.
 */
export function daysPastDue(lastDone: Date | null, intervalDays: number | null, now: Date): number | null {
  if (intervalDays === null || intervalDays === undefined) return null;
  const reference = lastDone ? lastDone.getTime() : -Infinity;
  const dueAt = reference + intervalDays * DAY_MS;
  return (now.getTime() - dueAt) / DAY_MS;
}

export type LoggableCareType = "watered" | "fertilized" | "misted";

export interface CareTask {
  plant: Plant;
  careType: LoggableCareType;
  dueAt: Date;
  daysPastDue: number;
}

const CARE_TYPE_FIELDS: {
  careType: LoggableCareType;
  last: "lastWateredAt" | "lastFertilizedAt" | "lastMistedAt";
  interval: "wateringIntervalDays" | "fertilizingIntervalDays" | "mistingIntervalDays";
}[] = [
  { careType: "watered", last: "lastWateredAt", interval: "wateringIntervalDays" },
  { careType: "fertilized", last: "lastFertilizedAt", interval: "fertilizingIntervalDays" },
  { careType: "misted", last: "lastMistedAt", interval: "mistingIntervalDays" },
];

/**
 * Flattens each plant's tracked care types into individual task objects,
 * one per care type that's due or was due within the last week. Sorted
 * most-overdue first. Callers slice this into buckets: `daysPastDue >= 0`
 * for the Today queue, the rest (already `> -7`) for "Later this week".
 */
export function getCareTasks(plants: Plant[], now: Date = new Date()): CareTask[] {
  const tasks: CareTask[] = [];

  for (const plant of plants) {
    for (const { careType, last, interval } of CARE_TYPE_FIELDS) {
      const intervalDays = plant[interval];
      const lastDone = plant[last];
      const past = daysPastDue(lastDone, intervalDays, now);
      if (past === null || past <= -7) continue;

      const dueAt = lastDone ? new Date(lastDone.getTime() + intervalDays! * DAY_MS) : now;
      tasks.push({ plant, careType, dueAt, daysPastDue: past });
    }
  }

  return tasks.sort((a, b) => b.daysPastDue - a.daysPastDue);
}

export interface MostUrgentTask {
  careType: LoggableCareType;
  label: string;
  daysPastDue: number;
}

const LABEL_BY_CARE_TYPE: Record<LoggableCareType, string> = {
  watered: "Water",
  fertilized: "Fertilize",
  misted: "Mist",
};

/**
 * The single most-overdue tracked care type for one plant — most overdue if
 * anything is overdue, otherwise soonest due. `null` when nothing is
 * tracked. Used for the plant-detail hero status tag.
 */
export function getMostUrgentTask(plant: Plant, now: Date = new Date()): MostUrgentTask | null {
  let best: MostUrgentTask | null = null;
  for (const { careType, last, interval } of CARE_TYPE_FIELDS) {
    const past = daysPastDue(plant[last], plant[interval], now);
    if (past === null) continue;
    if (best === null || past > best.daysPastDue) {
      best = { careType, label: LABEL_BY_CARE_TYPE[careType], daysPastDue: past };
    }
  }
  return best;
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
