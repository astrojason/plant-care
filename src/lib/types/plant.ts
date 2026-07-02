export type CareEventType = "watered" | "fertilized" | "misted" | "other";
export type PhotoType = "identification" | "diagnosis" | "general";
export type DiagnosisUrgency = "low" | "medium" | "high";
export type CareStatus = "ok" | "overdue" | "not-tracked";

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
  createdAt: Date;
}
