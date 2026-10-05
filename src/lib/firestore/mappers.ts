import type { Timestamp, DocumentData } from "firebase/firestore";
import type { DiagnosisResult } from "@/lib/openai/schemas";
import type {
  CareEvent,
  CareTargets,
  DetectedIssue,
  Diagnosis,
  LatestReading,
  Plant,
  PlantPhoto,
  SoilTest,
} from "@/lib/types/plant";

function toDateOrNull(value: Timestamp | null | undefined): Date | null {
  return value ? value.toDate() : null;
}

function mapRange(value: DocumentData | null | undefined) {
  return value ? { min: value.min ?? null, max: value.max ?? null } : null;
}

function mapTargets(data: DocumentData | null | undefined): CareTargets | null {
  if (!data) return null;
  return {
    moisturePercent: mapRange(data.moisturePercent),
    nutrientPercent: mapRange(data.nutrientPercent),
    lightLux: mapRange(data.lightLux),
    ph: mapRange(data.ph),
    ecUsCm: mapRange(data.ecUsCm),
  };
}

function mapLatestReading(data: DocumentData | null | undefined): LatestReading | null {
  const occurredAt = toDateOrNull(data?.occurredAt);
  if (!data || !occurredAt) return null;
  return {
    ph: data.ph ?? null,
    moisturePercent: data.moisturePercent ?? null,
    nutrientPercent: data.nutrientPercent ?? null,
    lightLux: data.lightLux ?? null,
    ecUsCm: data.ecUsCm ?? null,
    tdsPpm: data.tdsPpm ?? null,
    occurredAt,
  };
}

export function mapPlantDoc(id: string, data: DocumentData): Plant {
  return {
    id,
    nickname: data.nickname,
    speciesCommonName: data.speciesCommonName ?? null,
    speciesScientificName: data.speciesScientificName ?? null,
    speciesConfidence: data.speciesConfidence ?? null,
    location: data.location ?? null,
    primaryPhotoUrl: data.primaryPhotoUrl,
    wateringIntervalDays: data.wateringIntervalDays ?? null,
    fertilizingIntervalDays: data.fertilizingIntervalDays ?? null,
    mistingIntervalDays: data.mistingIntervalDays ?? null,
    targets: mapTargets(data.targets),
    latestReading: mapLatestReading(data.latestReading),
    lastWateredAt: toDateOrNull(data.lastWateredAt),
    lastFertilizedAt: toDateOrNull(data.lastFertilizedAt),
    lastMistedAt: toDateOrNull(data.lastMistedAt),
    createdAt: toDateOrNull(data.createdAt) ?? new Date(),
    updatedAt: toDateOrNull(data.updatedAt) ?? new Date(),
  };
}

export function mapCareEventDoc(id: string, data: DocumentData): CareEvent {
  return {
    id,
    eventType: data.eventType,
    notes: data.notes ?? null,
    occurredAt: toDateOrNull(data.occurredAt) ?? new Date(),
  };
}

export function mapPlantPhotoDoc(id: string, data: DocumentData): PlantPhoto {
  return {
    id,
    storagePath: data.storagePath,
    downloadUrl: data.downloadUrl,
    photoType: data.photoType,
    createdAt: toDateOrNull(data.createdAt) ?? new Date(),
  };
}

export function mapSoilTestDoc(id: string, data: DocumentData): SoilTest {
  return {
    id,
    ph: data.ph ?? null,
    moisturePercent: data.moisturePercent ?? null,
    nutrientPercent: data.nutrientPercent ?? null,
    lightLux: data.lightLux ?? null,
    ecUsCm: data.ecUsCm ?? null,
    tdsPpm: data.tdsPpm ?? null,
    notes: data.notes ?? null,
    occurredAt: toDateOrNull(data.occurredAt) ?? new Date(),
  };
}

export function mapDiagnosisDoc(id: string, data: DocumentData): Diagnosis {
  return {
    id,
    photoId: data.photoId ?? null,
    detectedIssues: (data.detectedIssues ?? []) as DetectedIssue[],
    suggestedTreatment: data.suggestedTreatment,
    urgency: data.urgency,
    result: (data.rawAiResponse ?? null) as DiagnosisResult | null,
    createdAt: toDateOrNull(data.createdAt) ?? new Date(),
  };
}
