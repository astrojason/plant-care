import type { DiagnosisResult } from "@/lib/openai/schemas";

export type CareEventType = "watered" | "fertilized" | "misted" | "other";
export type PhotoType = "identification" | "diagnosis" | "general";
export type DiagnosisUrgency = "low" | "medium" | "high";
export type CareStatus = "ok" | "overdue" | "not-tracked";

/** An acceptable range for one metric; a `null` bound means unbounded on that side. */
export interface TargetRange {
  min: number | null;
  max: number | null;
}

/** What a plant needs, to judge meter readings against. Each metric is optional. */
export interface CareTargets {
  moisturePercent: TargetRange | null;
  nutrientPercent: TargetRange | null;
  lightLux: TargetRange | null;
  ph: TargetRange | null;
  ecUsCm: TargetRange | null;
}

/** The newest soil test, denormalized onto the plant so the dashboard needn't query every plant's readings. */
export interface LatestReading {
  ph: number | null;
  moisturePercent: number | null;
  nutrientPercent: number | null;
  lightLux: number | null;
  ecUsCm: number | null;
  tdsPpm: number | null;
  occurredAt: Date;
}

export interface Plant {
  id: string;
  nickname: string;
  speciesCommonName: string | null;
  speciesScientificName: string | null;
  speciesConfidence: number | null;
  location: string | null;
  primaryPhotoUrl: string;
  wateringIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  mistingIntervalDays: number | null;
  targets: CareTargets | null;
  latestReading: LatestReading | null;
  lastWateredAt: Date | null;
  lastFertilizedAt: Date | null;
  lastMistedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlantPhoto {
  id: string;
  storagePath: string;
  downloadUrl: string;
  photoType: PhotoType;
  createdAt: Date;
}

export interface CareEvent {
  id: string;
  eventType: CareEventType;
  notes: string | null;
  occurredAt: Date;
}

export interface DetectedIssue {
  issue: string;
  confidence: number;
  symptomsObserved: string[];
}

export interface Diagnosis {
  id: string;
  photoId: string | null;
  detectedIssues: DetectedIssue[];
  suggestedTreatment: string;
  urgency: DiagnosisUrgency;
  /** The full saved AI result; null for any diagnosis saved without it. */
  result: DiagnosisResult | null;
  createdAt: Date;
}

/**
 * A reading from a handheld 7-in-1 soil meter. Soil: pH, moisture % and
 * nutrient (fertility) %. Light: lux. Water: EC (µS/cm) and TDS (ppm). Every
 * field is independently optional since a user may only note the ones they
 * read.
 */
export interface SoilTest {
  id: string;
  ph: number | null;
  moisturePercent: number | null;
  nutrientPercent: number | null;
  lightLux: number | null;
  ecUsCm: number | null;
  tdsPpm: number | null;
  notes: string | null;
  occurredAt: Date;
}
