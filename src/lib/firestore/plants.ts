import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, listAll, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";

export interface NewPlantInput {
  nickname: string;
  speciesCommonName: string | null;
  speciesScientificName: string | null;
  speciesConfidence: number | null;
  location: string | null;
  primaryPhotoUrl: string;
  wateringIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  mistingIntervalDays: number | null;
}

export async function createPlant(uid: string, input: NewPlantInput): Promise<string> {
  const plantsRef = collection(db, "users", uid, "plants");
  const docRef = await addDoc(plantsRef, {
    ...input,
    lastWateredAt: null,
    lastFertilizedAt: null,
    lastMistedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export interface SpeciesUpdate {
  nickname: string;
  speciesCommonName: string | null;
  speciesScientificName: string | null;
  location: string | null;
}

export async function updatePlantSpecies(
  uid: string,
  plantId: string,
  species: SpeciesUpdate
): Promise<void> {
  const plantRef = doc(db, "users", uid, "plants", plantId);
  await updateDoc(plantRef, { ...species, updatedAt: serverTimestamp() });
}

export interface CareScheduleUpdate {
  wateringIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  mistingIntervalDays: number | null;
}

export async function updateCareSchedule(
  uid: string,
  plantId: string,
  schedule: CareScheduleUpdate
): Promise<void> {
  const plantRef = doc(db, "users", uid, "plants", plantId);
  await updateDoc(plantRef, { ...schedule, updatedAt: serverTimestamp() });
}

const PLANT_SUBCOLLECTIONS = ["photos", "careEvents", "diagnoses", "soilTests"] as const;

/**
 * Firestore doesn't cascade-delete subcollections, and Storage files aren't
 * tied to Firestore docs at all — both must be cleaned up explicitly.
 */
export async function deletePlant(uid: string, plantId: string): Promise<void> {
  const batch = writeBatch(db);

  for (const sub of PLANT_SUBCOLLECTIONS) {
    const snapshot = await getDocs(collection(db, "users", uid, "plants", plantId, sub));
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
  }
  batch.delete(doc(db, "users", uid, "plants", plantId));

  await batch.commit();

  const folderRef = ref(storage, `users/${uid}/plants/${plantId}`);
  const listing = await listAll(folderRef);
  await Promise.all(listing.items.map((item) => deleteObject(item)));
}

export async function deletePlantPhoto(
  uid: string,
  plantId: string,
  photoId: string,
  storagePath: string
): Promise<void> {
  const photoRef = doc(db, "users", uid, "plants", plantId, "photos", photoId);
  await deleteDoc(photoRef);
  await deleteObject(ref(storage, storagePath)).catch((err) => {
    console.error("Failed to delete photo from storage", err);
  });
}
