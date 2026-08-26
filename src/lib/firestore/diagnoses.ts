import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
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
    rawAiResponse: result,
    createdAt: serverTimestamp(),
  });
}
