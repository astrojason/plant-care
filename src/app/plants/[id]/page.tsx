"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ArrowLeft, DotsThree } from "@phosphor-icons/react";
import { db, storage } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { CareEventButtons } from "@/components/CareEventButtons";
import { CadenceRows } from "@/components/CadenceRows";
import { GrowthTimeline } from "@/components/GrowthTimeline";
import { HistoryList, type HistoryEntry } from "@/components/HistoryList";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorBlock } from "@/components/ErrorBlock";
import { DiagnosisSheet } from "@/components/DiagnosisSheet";
import { EditSpeciesSheet, type SpeciesFormValues } from "@/components/EditSpeciesSheet";
import { EditScheduleSheet, type ScheduleFormValues } from "@/components/EditScheduleSheet";
import type { UploadedPhoto } from "@/components/PhotoUploader";
import { getMostUrgentTask } from "@/lib/care/schedule";
import { deleteCareEvent, logCareEvent } from "@/lib/care/log";
import { deletePlant, updateCareSchedule, updatePlantSpecies } from "@/lib/firestore/plants";
import { addPlantPhoto } from "@/lib/firestore/photos";
import { createDiagnosis } from "@/lib/firestore/diagnoses";
import { prepareImageForUpload } from "@/lib/media/imageProcessing";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { mapCareEventDoc, mapDiagnosisDoc, mapPlantDoc, mapPlantPhotoDoc } from "@/lib/firestore/mappers";
import type { CareEvent, CareEventType, Diagnosis, Plant, PlantPhoto } from "@/lib/types/plant";
import type { DiagnosisResult } from "@/lib/openai/schemas";

const CARE_EVENT_LABELS: Record<CareEventType, string> = {
  watered: "Watered",
  fertilized: "Fertilized",
  misted: "Misted",
  other: "Other",
};

interface NearLimitState {
  tokensUsed: number;
  dailyLimit: number;
  photoUrl: string;
  photoPath: string;
}

type Sheet = "none" | "diagnosis" | "species" | "schedule";

function PlantDetailContent({ plantId }: { plantId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [error, setError] = useState<unknown>(null);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [confirmDeletePlant, setConfirmDeletePlant] = useState(false);

  const [diagnosePhoto, setDiagnosePhoto] = useState<{ url: string; path: string } | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [diagnosisSaving, setDiagnosisSaving] = useState(false);
  const [diagnosisSaved, setDiagnosisSaved] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<unknown>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<NearLimitState | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "plants", plantId),
      (snap) => setPlant(snap.exists() ? mapPlantDoc(snap.id, snap.data()) : null),
      (err) => setError(err)
    );
    return unsubscribe;
  }, [user, plantId]);

  useEffect(() => {
    if (!user) return;
    const eventsQuery = query(
      collection(db, "users", user.uid, "plants", plantId, "careEvents"),
      orderBy("occurredAt", "desc")
    );
    const unsubscribe = onSnapshot(
      eventsQuery,
      (snap) => setCareEvents(snap.docs.map((d) => mapCareEventDoc(d.id, d.data()))),
      (err) => setError(err)
    );
    return unsubscribe;
  }, [user, plantId]);

  useEffect(() => {
    if (!user) return;
    const diagnosesQuery = query(
      collection(db, "users", user.uid, "plants", plantId, "diagnoses"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      diagnosesQuery,
      (snap) => setDiagnoses(snap.docs.map((d) => mapDiagnosisDoc(d.id, d.data()))),
      (err) => setError(err)
    );
    return unsubscribe;
  }, [user, plantId]);

  useEffect(() => {
    if (searchParams.get("diagnose") === "1") {
      openDiagnoseSheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once from the ?diagnose=1 entry link, not on every searchParams identity change
  }, []);

  useEffect(() => {
    if (!user) return;
    const photosQuery = query(
      collection(db, "users", user.uid, "plants", plantId, "photos"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(
      photosQuery,
      (snap) => setPhotos(snap.docs.map((d) => mapPlantPhotoDoc(d.id, d.data()))),
      (err) => setError(err)
    );
    return unsubscribe;
  }, [user, plantId]);

  const historyEntries: HistoryEntry[] = useMemo(() => {
    const careEntries: HistoryEntry[] = careEvents.map((e) => ({
      id: e.id,
      kind: "care",
      careEventType: e.eventType,
      label: CARE_EVENT_LABELS[e.eventType],
      date: e.occurredAt,
    }));
    const diagnosisEntries: HistoryEntry[] = diagnoses.map((d) => ({
      id: d.id,
      kind: "diagnosis",
      label: "Diagnosis",
      date: d.createdAt,
    }));
    return [...careEntries, ...diagnosisEntries].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [careEvents, diagnoses]);

  async function handleLog(eventType: "watered" | "fertilized" | "misted") {
    if (!user) return;
    await logCareEvent(user.uid, plantId, eventType);
  }

  async function handleDeleteCareEvent(eventId: string) {
    if (!user) return;
    const event = careEvents.find((e) => e.id === eventId);
    if (!event) return;
    await deleteCareEvent(user.uid, plantId, eventId, event.eventType);
  }

  async function handleDeletePlant() {
    if (!user) return;
    setConfirmDeletePlant(false);
    try {
      await deletePlant(user.uid, plantId);
      router.replace("/dashboard");
    } catch (err) {
      setError(err);
    }
  }

  async function handleSaveSpecies(values: SpeciesFormValues) {
    if (!user) return;
    try {
      await updatePlantSpecies(user.uid, plantId, {
        nickname: values.nickname,
        speciesCommonName: values.speciesCommonName || null,
        speciesScientificName: values.speciesScientificName || null,
        location: values.location || null,
      });
      setSheet("none");
    } catch (err) {
      setError(err);
    }
  }

  async function handleSaveSchedule(values: ScheduleFormValues) {
    if (!user) return;
    try {
      await updateCareSchedule(user.uid, plantId, values);
      setSheet("none");
    } catch (err) {
      setError(err);
    }
  }

  async function handleAddGrowthPhoto(file: File) {
    if (!user) return;
    const processed = await prepareImageForUpload(file);
    const storagePath = `users/${user.uid}/plants/${plantId}/${crypto.randomUUID()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, processed, { contentType: "image/jpeg" });
    const downloadUrl = await getDownloadURL(storageRef);
    await addPlantPhoto(user.uid, plantId, storagePath, downloadUrl, "general");
  }

  function openDiagnoseSheet() {
    setDiagnosePhoto(null);
    setDiagnosisResult(null);
    setDiagnosisSaved(false);
    setDiagnosisError(null);
    setOverflowOpen(false);
    setSheet("diagnosis");
  }

  async function runDiagnose(photoUrl: string, photoPath: string, confirmNearLimit = false) {
    if (!user) return;
    setDiagnosisError(null);
    setDiagnosing(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ photoUrl, plantId, confirmNearLimit }),
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? `Request failed with status ${res.status}`);
      }
      if (json.requiresConfirmation) {
        setPendingConfirmation({
          tokensUsed: json.tokensUsed,
          dailyLimit: json.dailyLimit,
          photoUrl,
          photoPath,
        });
        return;
      }
      setDiagnosisResult(json.result as DiagnosisResult);
    } catch (err) {
      setDiagnosisError(err);
    } finally {
      setDiagnosing(false);
    }
  }

  async function handleDiagnosePhotoUploaded(uploaded: UploadedPhoto) {
    setDiagnosePhoto({ url: uploaded.downloadUrl, path: uploaded.storagePath });
    await runDiagnose(uploaded.downloadUrl, uploaded.storagePath);
  }

  async function handleConfirmDiagnoseNearLimit() {
    if (!pendingConfirmation) return;
    const { photoUrl, photoPath } = pendingConfirmation;
    setPendingConfirmation(null);
    await runDiagnose(photoUrl, photoPath, true);
  }

  async function handleSaveDiagnosis() {
    if (!user || !diagnosisResult || !diagnosePhoto) return;
    setDiagnosisSaving(true);
    setDiagnosisError(null);
    try {
      const photoId = await addPlantPhoto(user.uid, plantId, diagnosePhoto.path, diagnosePhoto.url, "diagnosis");
      await createDiagnosis(user.uid, plantId, photoId, diagnosisResult);
      setDiagnosisSaved(true);
    } catch (err) {
      setDiagnosisError(err);
    } finally {
      setDiagnosisSaving(false);
    }
  }

  if (error !== null) {
    return (
      <div className="p-5">
        <ErrorBlock error={error} title="Something went wrong" />
      </div>
    );
  }

  if (plant === null) {
    return (
      <div className="flex flex-col gap-[var(--space-3)] p-5">
        <div className="skeleton-row" style={{ height: 300 }} />
        <div className="skeleton-row" style={{ height: 68 }} />
        <div className="skeleton-row" style={{ height: 68 }} />
      </div>
    );
  }

  const urgent = getMostUrgentTask(plant);
  let statusText: string | null = null;
  if (urgent) {
    if (urgent.daysPastDue >= 1) {
      const days = Math.floor(urgent.daysPastDue);
      statusText = `${urgent.label} overdue · ${days} day${days === 1 ? "" : "s"}`;
    } else if (urgent.daysPastDue >= 0) {
      statusText = `${urgent.label} overdue`;
    } else if (urgent.daysPastDue > -1) {
      statusText = `${urgent.label} due today`;
    }
  }

  return (
    <div className="flex flex-col">
      <div className="hero-photo-wrap" style={{ height: 300 }}>
        {plant.primaryPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URL
          <img src={plant.primaryPhotoUrl} alt="" className="lighten" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="placeholder-tile" style={{ width: "100%", height: "100%" }} />
        )}
        <div className="hero-scrim" />

        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="btn btn-icon hero-icon-btn"
          style={{ position: "absolute", top: 16, left: 16 }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setOverflowOpen((v) => !v)}
            className="btn btn-icon hero-icon-btn"
          >
            <DotsThree size={18} weight="bold" />
          </button>
          {overflowOpen && (
            <>
              <div
                onClick={() => setOverflowOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 5 }}
              />
              <div className="overflow-menu card elev-md">
                <button
                  type="button"
                  className="overflow-menu-item"
                  onClick={() => {
                    setOverflowOpen(false);
                    setSheet("species");
                  }}
                >
                  Edit species
                </button>
                <button
                  type="button"
                  className="overflow-menu-item"
                  onClick={() => {
                    setOverflowOpen(false);
                    setSheet("schedule");
                  }}
                >
                  Edit schedule
                </button>
                <button
                  type="button"
                  className="overflow-menu-item"
                  onClick={() => {
                    setOverflowOpen(false);
                    setConfirmDeletePlant(true);
                  }}
                >
                  Delete plant
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ position: "absolute", left: 20, right: 20, bottom: 16 }}>
          {statusText && (
            <span className="tag tag-accent" style={{ marginBottom: 6, display: "inline-flex" }}>
              {statusText}
            </span>
          )}
          <h1 style={{ fontSize: 29, fontWeight: 500, margin: 0 }}>{plant.nickname}</h1>
          <p className="text-secondary" style={{ fontSize: 13, margin: 0 }}>
            {[plant.speciesCommonName, plant.location].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-[var(--space-6)] p-5">
        <CareEventButtons plant={plant} onLog={handleLog} />

        <CadenceRows plant={plant} />

        <GrowthTimeline photos={photos} onAddPhoto={handleAddGrowthPhoto} />

        <section>
          <h2 className="kicker mb-[var(--space-2)]">History</h2>
          <HistoryList entries={historyEntries} onDeleteCareEvent={handleDeleteCareEvent} />
        </section>

        <button type="button" onClick={openDiagnoseSheet} className="btn btn-primary btn-block" style={{ minHeight: 46 }}>
          Something looks wrong
        </button>
      </div>

      {sheet === "diagnosis" && (
        <DiagnosisSheet
          plantName={plant.nickname}
          pathPrefix={`users/${user?.uid}/plants/${plantId}`}
          photoUrl={diagnosePhoto?.url ?? null}
          diagnosing={diagnosing}
          result={diagnosisResult}
          saving={diagnosisSaving}
          saved={diagnosisSaved}
          error={diagnosisError}
          onPhotoUploaded={handleDiagnosePhotoUploaded}
          onClose={() => setSheet("none")}
          onSave={handleSaveDiagnosis}
        />
      )}

      {sheet === "species" && (
        <EditSpeciesSheet
          initial={{
            nickname: plant.nickname,
            speciesCommonName: plant.speciesCommonName ?? "",
            speciesScientificName: plant.speciesScientificName ?? "",
            location: plant.location ?? "",
          }}
          onSave={handleSaveSpecies}
          onCancel={() => setSheet("none")}
        />
      )}

      {sheet === "schedule" && (
        <EditScheduleSheet
          initial={{
            wateringIntervalDays: plant.wateringIntervalDays,
            fertilizingIntervalDays: plant.fertilizingIntervalDays,
            mistingIntervalDays: plant.mistingIntervalDays,
          }}
          onSave={handleSaveSchedule}
          onCancel={() => setSheet("none")}
        />
      )}

      <ConfirmDialog
        open={confirmDeletePlant}
        title="Delete this plant?"
        description="This permanently removes the plant, its photos, and its full care/diagnosis history."
        confirmLabel="Delete"
        onConfirm={handleDeletePlant}
        onCancel={() => setConfirmDeletePlant(false)}
      />

      <ConfirmDialog
        open={pendingConfirmation !== null}
        title="Near today's AI budget"
        description={
          pendingConfirmation
            ? `${pendingConfirmation.tokensUsed.toLocaleString()} / ${pendingConfirmation.dailyLimit.toLocaleString()} tokens used today (across all apps). Proceed anyway?`
            : undefined
        }
        confirmLabel="Proceed"
        onConfirm={handleConfirmDiagnoseNearLimit}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
}

export default function PlantDetailPage() {
  const params = useParams<{ id: string }>();
  const plantId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <AuthGuard>
      <AppShell showTabBar={false}>
        <PlantDetailContent plantId={plantId} />
      </AppShell>
    </AuthGuard>
  );
}
