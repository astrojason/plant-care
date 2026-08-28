import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface NewSoilTestInput {
  ph: number | null;
  moistureLevel: number | null;
  lightLevel: number | null;
  notes: string | null;
}

export async function addSoilTest(uid: string, plantId: string, input: NewSoilTestInput): Promise<void> {
  const testsRef = collection(db, "users", uid, "plants", plantId, "soilTests");
  await addDoc(testsRef, { ...input, occurredAt: serverTimestamp() });
}

export async function deleteSoilTest(uid: string, plantId: string, testId: string): Promise<void> {
  const testRef = doc(db, "users", uid, "plants", plantId, "soilTests", testId);
  await deleteDoc(testRef);
}
