import type { CareTargets, LatestReading, Plant, TargetRange } from "../types/plant";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A reading only speaks for the plant for this long; after that the interval schedule takes over again. */
export const READING_FRESH_DAYS = 3;

export type ReadingMetric = "moisturePercent" | "nutrientPercent" | "lightLux" | "ph" | "ecUsCm";
export type ReadingLevel = "low" | "high";

export interface ReadingAlert {
  metric: ReadingMetric;
  level: ReadingLevel;
  value: number;
  /** Human-readable, e.g. "Soil moisture 12% is below 30–60%". */
  message: string;
}

const METRIC_LABELS: Record<ReadingMetric, { label: string; unit: string }> = {
  moisturePercent: { label: "Soil moisture", unit: "%" },
  nutrientPercent: { label: "Soil nutrients", unit: "%" },
  lightLux: { label: "Light", unit: " lux" },
  ph: { label: "Soil pH", unit: "" },
  ecUsCm: { label: "Water EC", unit: " µS/cm" },
};

const METRICS = Object.keys(METRIC_LABELS) as ReadingMetric[];

export function isReadingFresh(reading: LatestReading, now: Date): boolean {
  return now.getTime() - reading.occurredAt.getTime() < READING_FRESH_DAYS * DAY_MS;
}

function formatRange(range: TargetRange): string {
  if (range.min !== null && range.max !== null) return `${range.min}–${range.max}`;
  return range.min !== null ? `${range.min}+` : `≤ ${range.max}`;
}

function levelOf(value: number, range: TargetRange): ReadingLevel | null {
  if (range.min !== null && value < range.min) return "low";
  if (range.max !== null && value > range.max) return "high";
  return null;
}

/** Soil moisture/nutrients are corrected by watering/fertilizing, so an older reading no longer describes the plant afterwards. */
function lastCorrectedAt(plant: Plant, metric: ReadingMetric): Date | null {
  if (metric === "moisturePercent") return plant.lastWateredAt;
  if (metric === "nutrientPercent") return plant.lastFertilizedAt;
  return null;
}

/** Every metric in the latest fresh reading that falls outside the plant's target range. */
export function getReadingAlerts(plant: Plant, now: Date = new Date()): ReadingAlert[] {
  const { latestReading: reading, targets } = plant;
  if (!reading || !targets || !isReadingFresh(reading, now)) return [];

  const alerts: ReadingAlert[] = [];
  for (const metric of METRICS) {
    const value = reading[metric];
    const range = targets[metric as keyof CareTargets];
    if (value === null || !range) continue;
    const corrected = lastCorrectedAt(plant, metric);
    if (corrected && reading.occurredAt.getTime() <= corrected.getTime()) continue;
    const level = levelOf(value, range);
    if (level === null) continue;
    const { label, unit } = METRIC_LABELS[metric];
    alerts.push({
      metric,
      level,
      value,
      message: `${label} ${value}${unit} is ${level === "low" ? "below" : "above"} ${formatRange(range)}${unit}`,
    });
  }
  return alerts;
}

/** The metrics that can drive a care task, by care type. Misting has no meter. */
const METRIC_BY_CARE_TYPE = {
  watered: "moisturePercent",
  fertilized: "nutrientPercent",
} as const;

export type ReadingOverride =
  | { kind: "due"; reason: string }
  /** The reading says the plant is fine; hold off until `until` (when the reading goes stale). */
  | { kind: "ok"; until: Date };

/**
 * What the latest meter reading says about a care type, or null when it has
 * nothing to say (no reading/targets, stale, taken before the last time that
 * care was done, or the care type has no meter).
 */
export function getReadingOverride(
  plant: Plant,
  careType: "watered" | "fertilized" | "misted",
  lastDone: Date | null,
  now: Date = new Date()
): ReadingOverride | null {
  if (careType === "misted") return null;
  const { latestReading: reading, targets } = plant;
  if (!reading || !targets || !isReadingFresh(reading, now)) return null;
  if (lastDone && reading.occurredAt.getTime() <= lastDone.getTime()) return null;

  const metric = METRIC_BY_CARE_TYPE[careType];
  const value = reading[metric];
  const range = targets[metric];
  if (value === null || !range) return null;

  const level = levelOf(value, range);
  if (level === "low") {
    const alert = getReadingAlerts(plant, now).find((a) => a.metric === metric);
    return { kind: "due", reason: alert?.message ?? "Reading is below target" };
  }
  return { kind: "ok", until: new Date(reading.occurredAt.getTime() + READING_FRESH_DAYS * DAY_MS) };
}
