import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { PhotoType } from "@/lib/types/plant";

export async function addPlantPhoto(
  uid: string,
  plantId: string,
  storagePath: string,
  downloadUrl: string,
  photoType: PhotoType
): Promise<string> {
  const photosRef = collection(db, "users", uid, "plants", plantId, "photos");
  const docRef = await addDoc(photosRef, {
    storagePath,
    downloadUrl,
    photoType,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
