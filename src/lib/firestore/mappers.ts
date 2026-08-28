import type { Timestamp, DocumentData } from "firebase/firestore";
import type { CareEvent, DetectedIssue, Diagnosis, Plant, PlantPhoto, SoilTest } from "@/lib/types/plant";

function toDateOrNull(value: Timestamp | null | undefined): Date | null {
  return value ? value.toDate() : null;
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
    moistureLevel: data.moistureLevel ?? null,
    lightLevel: data.lightLevel ?? null,
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
    createdAt: toDateOrNull(data.createdAt) ?? new Date(),
  };
}
