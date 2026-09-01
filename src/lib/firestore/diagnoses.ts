import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { deletePlantPhoto } from "@/lib/firestore/plants";
import type { DiagnosisResult } from "@/lib/openai/schemas";

export async function createDiagnosis(
  uid: string,
  plantId: string,
  photoId: string | null,
  result: DiagnosisResult
): Promise<void> {
  const diagnosesRef = collection(db, "users", uid, "plants", plantId, "diagnoses");
  await addDoc(diagnosesRef, {
    photoId,
    detectedIssues: result.detected_issues,
    suggestedTreatment: result.suggested_treatment,
    urgency: result.urgency,
    treatmentSteps: result.treatment_steps ?? null,
    followUpDays: result.follow_up_days ?? null,
    scheduleAdjustment: result.schedule_adjustment ?? null,
    rawAiResponse: result,
    createdAt: serverTimestamp(),
  });
}

export async function deleteDiagnosis(uid: string, plantId: string, diagnosisId: string): Promise<void> {
  const diagnosisRef = doc(db, "users", uid, "plants", plantId, "diagnoses", diagnosisId);
  const diagnosisSnap = await getDoc(diagnosisRef);
  const photoId = diagnosisSnap.data()?.photoId as string | null | undefined;

  await deleteDoc(diagnosisRef);

  if (photoId) {
    const photoRef = doc(db, "users", uid, "plants", plantId, "photos", photoId);
    const photoSnap = await getDoc(photoRef);
    const storagePath = photoSnap.data()?.storagePath as string | undefined;
    if (storagePath) {
      await deletePlantPhoto(uid, plantId, photoId, storagePath);
    }
  }
}
