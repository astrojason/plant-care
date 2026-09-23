import { describe, expect, it } from "vitest";
import { mapCareEventDoc, mapDiagnosisDoc, mapPlantDoc, mapPlantPhotoDoc, mapSoilTestDoc } from "./mappers";

function ts(date: Date) {
  return { toDate: () => date };
}

describe("mapPlantDoc", () => {
  it("maps a full Firestore plant document to a Plant", () => {
    const plant = mapPlantDoc("plant-1", {
      nickname: "Fig",
      speciesCommonName: "Fiddle Leaf Fig",
      speciesScientificName: "Ficus lyrata",
      speciesConfidence: 0.9,
      location: "Living room",
      primaryPhotoUrl: "https://x/y.jpg",
      wateringIntervalDays: 7,
      fertilizingIntervalDays: 30,
      mistingIntervalDays: null,
      lastWateredAt: ts(new Date("2026-06-25")),
      lastFertilizedAt: null,
      lastMistedAt: null,
      createdAt: ts(new Date("2026-01-01")),
      updatedAt: ts(new Date("2026-01-02")),
    });

    expect(plant.id).toBe("plant-1");
    expect(plant.nickname).toBe("Fig");
    expect(plant.lastWateredAt).toEqual(new Date("2026-06-25"));
    expect(plant.lastFertilizedAt).toBeNull();
    expect(plant.mistingIntervalDays).toBeNull();
  });

  it("defaults missing optional fields to null", () => {
    const plant = mapPlantDoc("plant-1", {
      nickname: "Fig",
      primaryPhotoUrl: "https://x/y.jpg",
    });

    expect(plant.speciesCommonName).toBeNull();
    expect(plant.wateringIntervalDays).toBeNull();
    expect(plant.lastWateredAt).toBeNull();
  });
});

describe("mapCareEventDoc", () => {
  it("maps a Firestore care event document", () => {
    const event = mapCareEventDoc("event-1", {
      eventType: "watered",
      notes: "a little extra this time",
      occurredAt: ts(new Date("2026-06-25T10:00:00Z")),
    });

    expect(event).toEqual({
      id: "event-1",
      eventType: "watered",
      notes: "a little extra this time",
      occurredAt: new Date("2026-06-25T10:00:00Z"),
    });
  });

  it("defaults notes to null when absent", () => {
    const event = mapCareEventDoc("event-1", {
      eventType: "misted",
      occurredAt: ts(new Date("2026-06-25T10:00:00Z")),
    });

    expect(event.notes).toBeNull();
  });
});

describe("mapPlantPhotoDoc", () => {
  it("maps a Firestore photo document", () => {
    const photo = mapPlantPhotoDoc("photo-1", {
      storagePath: "users/u1/plants/p1/a.jpg",
      downloadUrl: "https://x/a.jpg",
      photoType: "general",
      createdAt: ts(new Date("2026-06-25T10:00:00Z")),
    });

    expect(photo).toEqual({
      id: "photo-1",
      storagePath: "users/u1/plants/p1/a.jpg",
      downloadUrl: "https://x/a.jpg",
      photoType: "general",
      createdAt: new Date("2026-06-25T10:00:00Z"),
    });
  });
});

describe("mapSoilTestDoc", () => {
  it("maps a Firestore soil test document", () => {
    const test = mapSoilTestDoc("test-1", {
      ph: 6.5,
      moistureLevel: 7,
      lightLevel: 5,
      notes: "topsoil felt dry",
      occurredAt: ts(new Date("2026-06-25T10:00:00Z")),
    });

    expect(test).toEqual({
      id: "test-1",
      ph: 6.5,
      moistureLevel: 7,
      lightLevel: 5,
      notes: "topsoil felt dry",
      occurredAt: new Date("2026-06-25T10:00:00Z"),
    });
  });

  it("defaults missing optional fields to null", () => {
    const test = mapSoilTestDoc("test-1", { occurredAt: ts(new Date("2026-06-25T10:00:00Z")) });

    expect(test.ph).toBeNull();
    expect(test.moistureLevel).toBeNull();
    expect(test.lightLevel).toBeNull();
    expect(test.notes).toBeNull();
  });
});

describe("mapDiagnosisDoc", () => {
  it("maps a Firestore diagnosis document", () => {
    const diagnosis = mapDiagnosisDoc("diag-1", {
      photoId: "photo-1",
      detectedIssues: [{ issue: "Overwatering", confidence: 0.7, symptomsObserved: ["Yellow leaves"] }],
      suggestedTreatment: "Water less often.",
      urgency: "medium",
      rawAiResponse: { overall_assessment: "Too wet." },
      createdAt: ts(new Date("2026-06-25T10:00:00Z")),
    });

    expect(diagnosis).toEqual({
      id: "diag-1",
      photoId: "photo-1",
      detectedIssues: [{ issue: "Overwatering", confidence: 0.7, symptomsObserved: ["Yellow leaves"] }],
      suggestedTreatment: "Water less often.",
      urgency: "medium",
      result: { overall_assessment: "Too wet." },
      createdAt: new Date("2026-06-25T10:00:00Z"),
    });
  });
});
