"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { FirstAidKit } from "@phosphor-icons/react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { ErrorBlock } from "@/components/ErrorBlock";
import { mapPlantDoc } from "@/lib/firestore/mappers";
import type { Plant } from "@/lib/types/plant";

function DiagnoseContent() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "plants"),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setPlants(snapshot.docs.map((d) => mapPlantDoc(d.id, d.data())));
      },
      (err) => setError(err)
    );
    return unsubscribe;
  }, [user]);

  if (error !== null) {
    return (
      <div className="p-5">
        <ErrorBlock error={error} title="Failed to load plants" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)] p-5" style={{ paddingBottom: 90 }}>
      <div>
        <h1 style={{ fontSize: 27, fontWeight: 500, margin: 0 }}>Diagnose</h1>
        <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>
          Pick a plant to take a photo of what&apos;s wrong.
        </p>
      </div>

      {plants === null && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-[var(--space-1)]">
          <div className="skeleton-row" style={{ height: 67 }} />
          <div className="skeleton-row" style={{ height: 67 }} />
        </div>
      )}

      {plants !== null && plants.length === 0 && (
        <div className="empty-state">
          <p>Add a plant first, then you can diagnose it.</p>
          <Link href="/plants/new" className="btn btn-primary">
            Add your first plant
          </Link>
        </div>
      )}

      {plants !== null && plants.length > 0 && (
        <div className="flex flex-col">
          {plants.map((plant, i) => (
            <Link
              key={plant.id}
              href={`/plants/${plant.id}?diagnose=1`}
              className={`flex items-center gap-[var(--space-3)] row-rule${i % 2 === 1 ? " zebra-odd" : ""}`}
              style={{ padding: "11px var(--space-2)", textDecoration: "none", color: "inherit" }}
            >
              {plant.primaryPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URL
                <img
                  src={plant.primaryPhotoUrl}
                  alt=""
                  style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none" }}
                />
              ) : (
                <div className="placeholder-tile" style={{ width: 44, height: 44, borderRadius: "var(--radius-md)" }} />
              )}
              <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{plant.nickname}</span>
              <FirstAidKit size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiagnosePage() {
  return (
    <AuthGuard>
      <AppShell>
        <DiagnoseContent />
      </AppShell>
    </AuthGuard>
  );
}
