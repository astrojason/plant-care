import type { CareStatus, Plant } from "../types/plant";
import { getReadingOverride } from "./readings";

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
  /** Set when a meter reading, not the interval schedule, is why this is due. */
  reason: string | null;
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

interface EffectiveCare {
  daysPastDue: number | null;
  dueAt: Date;
  reason: string | null;
}

/**
 * The schedule's verdict for one care type, overridden by the plant's latest
 * fresh meter reading when it has one: a low reading makes the care due now
 * (even if untracked or not yet due by interval), and an in-range reading
 * holds off an overdue schedule until the reading goes stale.
 */
function getEffectiveCare(
  plant: Plant,
  { careType, last, interval }: (typeof CARE_TYPE_FIELDS)[number],
  now: Date
): EffectiveCare {
  const lastDone = plant[last];
  const intervalDays = plant[interval];
  const scheduled = daysPastDue(lastDone, intervalDays, now);
  const scheduledDueAt = lastDone && intervalDays ? new Date(lastDone.getTime() + intervalDays * DAY_MS) : now;

  const override = getReadingOverride(plant, careType, lastDone, now);
  if (override?.kind === "due") {
    return { daysPastDue: Math.max(scheduled ?? 0, 0), dueAt: scheduled !== null && scheduled > 0 ? scheduledDueAt : now, reason: override.reason };
  }
  if (override?.kind === "ok" && scheduled !== null && scheduled > 0) {
    return { daysPastDue: (now.getTime() - override.until.getTime()) / DAY_MS, dueAt: override.until, reason: null };
  }
  return { daysPastDue: scheduled, dueAt: scheduledDueAt, reason: null };
}

/**
 * Flattens each plant's tracked care types into individual task objects,
 * one per care type that's due or was due within the last week. Sorted
 * most-overdue first. Callers slice this into buckets: `daysPastDue >= 0`
 * for the Today queue, the rest (already `> -7`) for "Later this week".
 */
export function getCareTasks(plants: Plant[], now: Date = new Date()): CareTask[] {
  const tasks: CareTask[] = [];

  for (const plant of plants) {
    for (const field of CARE_TYPE_FIELDS) {
      const { daysPastDue: past, dueAt, reason } = getEffectiveCare(plant, field, now);
      if (past === null || past <= -7) continue;
      tasks.push({ plant, careType: field.careType, dueAt, daysPastDue: past, reason });
    }
  }

  return tasks.sort((a, b) => b.daysPastDue - a.daysPastDue);
}

export interface MostUrgentTask {
  careType: LoggableCareType;
  label: string;
  daysPastDue: number;
  reason: string | null;
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
  for (const field of CARE_TYPE_FIELDS) {
    const { daysPastDue: past, reason } = getEffectiveCare(plant, field, now);
    if (past === null) continue;
    if (best === null || past > best.daysPastDue) {
      best = { careType: field.careType, label: LABEL_BY_CARE_TYPE[field.careType], daysPastDue: past, reason };
    }
  }
  return best;
}

function maxDaysPastDue(plant: Plant, now: Date): number {
  const values = CARE_TYPE_FIELDS.map((field) => getEffectiveCare(plant, field, now).daysPastDue).filter((v): v is number => v !== null);

  return values.length > 0 ? Math.max(...values) : -Infinity;
}

/**
 * Comparator for Array.prototype.sort: most-overdue plants first, plants
 * with no tracked care schedule last.
 */
export function compareByUrgency(a: Plant, b: Plant, now: Date = new Date()): number {
  return maxDaysPastDue(b, now) - maxDaysPastDue(a, now);
}
