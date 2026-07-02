import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CareEventType } from "@/lib/types/plant";

const FIELD_BY_EVENT_TYPE: Partial<Record<CareEventType, string>> = {
  watered: "lastWateredAt",
  fertilized: "lastFertilizedAt",
  misted: "lastMistedAt",
};

/**
 * Adds a care event and updates the plant's last{Type}At field atomically,
 * so the dashboard's due/overdue calculation never sees a partial write.
 */
export async function logCareEvent(
  uid: string,
  plantId: string,
  eventType: CareEventType,
  notes?: string
): Promise<void> {
  const plantRef = doc(db, "users", uid, "plants", plantId);
  const eventsRef = collection(db, "users", uid, "plants", plantId, "careEvents");
  const newEventRef = doc(eventsRef);
  const field = FIELD_BY_EVENT_TYPE[eventType];

  await runTransaction(db, async (tx) => {
    tx.set(newEventRef, {
      eventType,
      notes: notes ?? null,
      occurredAt: serverTimestamp(),
    });
    if (field) {
      tx.update(plantRef, { [field]: serverTimestamp() });
    }
  });
}

/**
 * Recomputes last{Type}At from the remaining care events of that type after
 * one is deleted — a mis-tapped "Watered" shouldn't leave a stale timestamp.
 * Pure and unit-tested directly; the Firestore query that feeds it is thin
 * glue exercised by the E2E suite instead.
 */
export function computeLastDoneAfterDelete(
  remainingEvents: { eventType: CareEventType; occurredAt: Date }[],
  eventType: CareEventType
): Date | null {
  const matching = remainingEvents.filter((e) => e.eventType === eventType);
  if (matching.length === 0) return null;
  return matching.reduce(
    (latest, e) => (e.occurredAt > latest ? e.occurredAt : latest),
    matching[0].occurredAt
  );
}

export async function deleteCareEvent(
  uid: string,
  plantId: string,
  eventId: string,
  eventType: CareEventType
): Promise<void> {
  const plantRef = doc(db, "users", uid, "plants", plantId);
  const eventsRef = collection(db, "users", uid, "plants", plantId, "careEvents");
  const eventRef = doc(eventsRef, eventId);

  await deleteDoc(eventRef);

  const field = FIELD_BY_EVENT_TYPE[eventType];
  if (!field) return;

  const recentQuery = query(
    eventsRef,
    where("eventType", "==", eventType),
    orderBy("occurredAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(recentQuery);
  const newLastDone = snapshot.empty
    ? null
    : (snapshot.docs[0].data().occurredAt as Timestamp).toDate();

  await updateDoc(plantRef, { [field]: newLastDone });
}
