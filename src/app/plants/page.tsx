"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { MagnifyingGlass, Plus, Drop, Flask, CloudFog } from "@phosphor-icons/react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { ErrorBlock } from "@/components/ErrorBlock";
import { compareByUrgency, getCareStatus, getMostUrgentTask } from "@/lib/care/schedule";
import { mapPlantDoc } from "@/lib/firestore/mappers";
import type { CareStatus, Plant } from "@/lib/types/plant";

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
function numberWord(n: number): string {
  return n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

function plantIsOverdue(plant: Plant, now: Date): boolean {
  return (
    getCareStatus(plant.lastWateredAt, plant.wateringIntervalDays, now) === "overdue" ||
    getCareStatus(plant.lastFertilizedAt, plant.fertilizingIntervalDays, now) === "overdue" ||
    getCareStatus(plant.lastMistedAt, plant.mistingIntervalDays, now) === "overdue"
  );
}

function nextDueText(plant: Plant, now: Date): { text: string; accent: boolean } {
  const urgent = getMostUrgentTask(plant, now);
  if (!urgent) return { text: "Not tracked", accent: false };
  if (urgent.daysPastDue >= 1) {
    const days = Math.floor(urgent.daysPastDue);
    return { text: `${days}d overdue`, accent: true };
  }
  if (urgent.daysPastDue >= 0) return { text: "Due today", accent: true };
  const days = Math.ceil(-urgent.daysPastDue);
  return { text: `in ${days}d`, accent: false };
}

function CareIcons({ plant, now }: { plant: Plant; now: Date }) {
  const items: { Icon: typeof Drop; status: CareStatus }[] = [
    { Icon: Drop, status: getCareStatus(plant.lastWateredAt, plant.wateringIntervalDays, now) },
    { Icon: Flask, status: getCareStatus(plant.lastFertilizedAt, plant.fertilizingIntervalDays, now) },
    { Icon: CloudFog, status: getCareStatus(plant.lastMistedAt, plant.mistingIntervalDays, now) },
  ];
  return (
    <span className="flex items-center gap-1">
      {items.map(({ Icon, status }, i) => (
        <Icon
          key={i}
          size={12}
          weight="regular"
          style={{
            color:
              status === "overdue"
                ? "var(--color-accent)"
                : status === "ok"
                  ? "color-mix(in srgb, var(--color-text) 50%, transparent)"
                  : "color-mix(in srgb, var(--color-text) 30%, transparent)",
          }}
        />
      ))}
    </span>
  );
}

function PlantsContent() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [location, setLocation] = useState<string | null>(null);

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

  const now = useMemo(() => new Date(), []);
  const locations = useMemo(
    () => Array.from(new Set((plants ?? []).map((p) => p.location).filter((l): l is string => Boolean(l)))).sort(),
    [plants]
  );

  const filtered = useMemo(() => {
    if (!plants) return [];
    return plants
      .filter((p) => (location ? p.location === location : true))
      .filter((p) => (query ? p.nickname.toLowerCase().includes(query.toLowerCase()) : true))
      .sort((a, b) => compareByUrgency(a, b, now));
  }, [plants, location, query, now]);

  const attention = filtered.filter((p) => plantIsOverdue(p, now));
  const fine = filtered.filter((p) => !plantIsOverdue(p, now));

  if (error !== null) {
    return (
      <div className="p-5">
        <ErrorBlock error={error} title="Failed to load plants" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)] p-5" style={{ paddingBottom: 90 }}>
      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: 27, fontWeight: 500, margin: 0 }}>
          {plants === null ? "Plants" : `${numberWord(plants.length)} plant${plants.length === 1 ? "" : "s"}`}
        </h1>
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setShowSearch((v) => !v)}
            className="btn btn-icon btn-secondary"
          >
            <MagnifyingGlass size={16} />
          </button>
          <Link href="/plants/new" aria-label="Add plant" className="btn btn-icon btn-primary">
            <Plus size={16} weight="bold" />
          </Link>
        </div>
      </div>

      {showSearch && (
        <input
          className="input"
          placeholder="Search plants"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      )}

      {plants !== null && plants.length > 0 && (
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <button type="button" onClick={() => setLocation(null)} className={`tag ${location === null ? "tag-accent" : "tag-neutral"}`}>
            All
          </button>
          {locations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              className={`tag ${location === loc ? "tag-accent" : "tag-neutral"}`}
            >
              {loc}
            </button>
          ))}
        </div>
      )}

      {plants === null && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-[var(--space-1)]">
          <div className="skeleton-row" style={{ height: 67 }} />
          <div className="skeleton-row" style={{ height: 67 }} />
          <div className="skeleton-row" style={{ height: 67 }} />
        </div>
      )}

      {plants !== null && plants.length === 0 && (
        <div className="empty-state">
          <p>Nothing here yet</p>
          <Link href="/plants/new" className="btn btn-primary">
            Add your first plant
          </Link>
        </div>
      )}

      {plants !== null && plants.length > 0 && (
        <div className="flex flex-col">
          {attention.length > 0 && (
            <>
              <div className="flex items-center gap-1 mb-[var(--space-1)]" style={{ fontSize: 12, textTransform: "uppercase" }}>
                <span style={{ color: "var(--color-accent)" }}>Needs attention</span>
                <span className="text-tertiary">({attention.length})</span>
              </div>
              {attention.map((plant, i) => (
                <PlantRow key={plant.id} plant={plant} now={now} odd={i % 2 === 1} />
              ))}
            </>
          )}
          {fine.length > 0 && (
            <>
              <div
                className="flex items-center gap-1 mt-[var(--space-3)] mb-[var(--space-1)]"
                style={{ fontSize: 12, textTransform: "uppercase" }}
              >
                <span className="text-secondary" style={{ opacity: 0.5 }}>
                  Doing fine
                </span>
                <span className="text-tertiary">({fine.length})</span>
              </div>
              {fine.map((plant, i) => (
                <PlantRow key={plant.id} plant={plant} now={now} odd={i % 2 === 1} />
              ))}
            </>
          )}
          {filtered.length === 0 && (
            <p className="text-secondary" style={{ fontSize: 14 }}>
              No plants match.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PlantRow({ plant, now, odd }: { plant: Plant; now: Date; odd: boolean }) {
  const due = nextDueText(plant, now);
  return (
    <Link
      href={`/plants/${plant.id}`}
      className={`flex items-center gap-[var(--space-3)] row-rule${odd ? " zebra-odd" : ""}`}
      style={{ padding: "11px var(--space-2) 11px var(--space-3)", textDecoration: "none", color: "inherit" }}
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
      <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {plant.nickname}
        </span>
        <span
          className="text-tertiary"
          style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {[plant.speciesCommonName, plant.location].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span style={{ fontSize: 12, color: due.accent ? "var(--color-accent)" : "var(--text-secondary)" }}>{due.text}</span>
        <CareIcons plant={plant} now={now} />
      </div>
    </Link>
  );
}

export default function PlantsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <PlantsContent />
      </AppShell>
    </AuthGuard>
  );
}
