import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface NewSoilTestInput {
  ph: number | null;
  moisturePercent: number | null;
  nutrientPercent: number | null;
  lightLux: number | null;
  ecUsCm: number | null;
  tdsPpm: number | null;
  notes: string | null;
}

/**
 * Copies the plant's newest soil test onto the plant doc (or clears it), so
 * care status can use it without reading every plant's readings.
 */
async function syncLatestReading(uid: string, plantId: string): Promise<void> {
  const testsRef = collection(db, "users", uid, "plants", plantId, "soilTests");
  const newest = await getDocs(query(testsRef, orderBy("occurredAt", "desc"), limit(1)));
  const data = newest.docs[0]?.data();
  const latestReading = data
    ? {
        ph: data.ph ?? null,
        moisturePercent: data.moisturePercent ?? null,
        nutrientPercent: data.nutrientPercent ?? null,
        lightLux: data.lightLux ?? null,
        ecUsCm: data.ecUsCm ?? null,
        tdsPpm: data.tdsPpm ?? null,
        occurredAt: data.occurredAt,
      }
    : null;
  await updateDoc(doc(db, "users", uid, "plants", plantId), { latestReading, updatedAt: serverTimestamp() });
}

export async function addSoilTest(uid: string, plantId: string, input: NewSoilTestInput): Promise<void> {
  const testsRef = collection(db, "users", uid, "plants", plantId, "soilTests");
  await addDoc(testsRef, { ...input, occurredAt: serverTimestamp() });
  await syncLatestReading(uid, plantId);
}

export async function deleteSoilTest(uid: string, plantId: string, testId: string): Promise<void> {
  const testRef = doc(db, "users", uid, "plants", plantId, "soilTests", testId);
  await deleteDoc(testRef);
  await syncLatestReading(uid, plantId);
}
