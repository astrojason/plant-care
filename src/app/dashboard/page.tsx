"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { PlantCard } from "@/components/PlantCard";
import { ErrorBlock } from "@/components/ErrorBlock";
import { compareByUrgency } from "@/lib/care/schedule";
import { mapPlantDoc } from "@/lib/firestore/mappers";
import type { Plant } from "@/lib/types/plant";

function DashboardContent() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "plants"),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setPlants(snapshot.docs.map((docSnap) => mapPlantDoc(docSnap.id, docSnap.data())));
      },
      (err) => setError(err)
    );
    return unsubscribe;
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Your plants</h1>
        <Link
          href="/plants/new"
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Add plant
        </Link>
      </div>

      {error !== null && (
        <div className="mt-6">
          <ErrorBlock error={error} title="Failed to load plants" />
        </div>
      )}

      {error === null && plants === null && (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      )}

      {error === null && plants !== null && plants.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">No plants yet. Add your first one!</p>
      )}

      {error === null && plants !== null && plants.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[...plants].sort((a, b) => compareByUrgency(a, b)).map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
