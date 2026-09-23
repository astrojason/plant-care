import { collection, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase/client";

export const DEFAULT_LOCATIONS = ["Living room", "Bedroom", "Kitchen", "Office", "Bathroom"];

function locationsDoc(uid: string) {
  return doc(db, "users", uid, "settings", "locations");
}

/**
 * The user's available locations. Until they first edit the list it is the
 * defaults plus any location already used by a plant; after that it is exactly
 * the saved list.
 */
export function useLocations(uid: string | undefined): string[] {
  const [saved, setSaved] = useState<string[] | null>(null);
  const [inUse, setInUse] = useState<string[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsubSaved = onSnapshot(locationsDoc(uid), (snap) => {
      const names = snap.exists() ? snap.data()?.names : null;
      setSaved(Array.isArray(names) ? (names as string[]) : null);
    });
    const unsubPlants = onSnapshot(collection(db, "users", uid, "plants"), (snap) => {
      const names = snap.docs.map((d) => d.data().location as string | null | undefined).filter((l): l is string => Boolean(l));
      setInUse(Array.from(new Set(names)));
    });
    return () => {
      unsubSaved();
      unsubPlants();
    };
  }, [uid]);

  return useMemo(() => saved ?? Array.from(new Set([...DEFAULT_LOCATIONS, ...inUse])), [saved, inUse]);
}

export async function saveLocations(uid: string, names: string[]): Promise<void> {
  await setDoc(locationsDoc(uid), { names });
}

/** Renames a location everywhere: in the saved list and on every plant using it. */
export async function renameLocation(uid: string, current: string[], from: string, to: string): Promise<void> {
  const plants = await getDocs(query(collection(db, "users", uid, "plants"), where("location", "==", from)));
  const batch = writeBatch(db);
  plants.docs.forEach((d) => batch.update(d.ref, { location: to }));
  batch.set(locationsDoc(uid), { names: current.map((n) => (n === from ? to : n)) });
  await batch.commit();
}
