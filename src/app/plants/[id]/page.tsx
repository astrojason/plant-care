"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { CareEventButtons } from "@/components/CareEventButtons";
import { CareEventHistory } from "@/components/CareEventHistory";
import { CareStatusBadge } from "@/components/CareStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorBlock } from "@/components/ErrorBlock";
import { PhotoUploader, type UploadedPhoto } from "@/components/PhotoUploader";
import { DiagnosisResultView } from "@/components/DiagnosisResult";
import { getCareStatus } from "@/lib/care/schedule";
import { deleteCareEvent, logCareEvent } from "@/lib/care/log";
import { deletePlant, updateCareSchedule, updatePlantSpecies } from "@/lib/firestore/plants";
import { addPlantPhoto } from "@/lib/firestore/photos";
import { createDiagnosis } from "@/lib/firestore/diagnoses";
import { mapCareEventDoc, mapDiagnosisDoc, mapPlantDoc } from "@/lib/firestore/mappers";
import type { CareEvent, Diagnosis, Plant } from "@/lib/types/plant";
import type { DiagnosisResult } from "@/lib/openai/schemas";

interface NearLimitState {
  tokensUsed: number;
  dailyLimit: number;
  photoUrl: string;
  photoPath: string;
}

function PlantDetailContent({ plantId }: { plantId: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [error, setError] = useState<unknown>(null);

  const [confirmDeletePlant, setConfirmDeletePlant] = useState(false);

  const [editingSpecies, setEditingSpecies] = useState(false);
  const [speciesForm, setSpeciesForm] = useState({
    nickname: "",
    speciesCommonName: "",
    speciesScientificName: "",
    location: "",
  });

  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    wateringIntervalDays: "",
    fertilizingIntervalDays: "",
    mistingIntervalDays: "",
  });

  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<NearLimitState | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "plants", plantId),
      (snap) => {
        if (!snap.exists()) {
          setPlant(null);
          return;
        }
        const mapped = mapPlantDoc(snap.id, snap.data());
        setPlant(mapped);
        setSpeciesForm({
          nickname: mapped.nickname,
          speciesCommonName: mapped.speciesCommonName ?? "",
          speciesScientificName: mapped.speciesScientificName ?? "",
          location: mapped.location ?? "",
        });
        setScheduleForm({
          wateringIntervalDays: mapped.wateringIntervalDays?.toString() ?? "",
          fertilizingIntervalDays: mapped.fertilizingIntervalDays?.toString() ?? "",
          mistingIntervalDays: mapped.mistingIntervalDays?.toString() ?? "",
        });
      },
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

  async function handleLog(eventType: "watered" | "fertilized" | "misted") {
    if (!user) return;
    await logCareEvent(user.uid, plantId, eventType);
  }

  async function handleDeleteEvent(eventId: string) {
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

  async function handleSaveSpecies() {
    if (!user) return;
    try {
      await updatePlantSpecies(user.uid, plantId, {
        nickname: speciesForm.nickname,
        speciesCommonName: speciesForm.speciesCommonName || null,
        speciesScientificName: speciesForm.speciesScientificName || null,
        location: speciesForm.location || null,
      });
      setEditingSpecies(false);
    } catch (err) {
      setError(err);
    }
  }

  async function handleSaveSchedule() {
    if (!user) return;
    try {
      await updateCareSchedule(user.uid, plantId, {
        wateringIntervalDays: scheduleForm.wateringIntervalDays
          ? Number(scheduleForm.wateringIntervalDays)
          : null,
        fertilizingIntervalDays: scheduleForm.fertilizingIntervalDays
          ? Number(scheduleForm.fertilizingIntervalDays)
          : null,
        mistingIntervalDays: scheduleForm.mistingIntervalDays
          ? Number(scheduleForm.mistingIntervalDays)
          : null,
      });
      setEditingSchedule(false);
    } catch (err) {
      setError(err);
    }
  }

  async function runDiagnose(photoUrl: string, photoPath: string, confirmNearLimit = false) {
    if (!user) return;
    setError(null);
    setDiagnosing(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ photoUrl, plantId, confirmNearLimit }),
      });
      const json = await res.json();
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
      const result = json.result as DiagnosisResult;
      setDiagnosisResult(result);
      const photoId = await addPlantPhoto(user.uid, plantId, photoPath, photoUrl, "diagnosis");
      await createDiagnosis(user.uid, plantId, photoId, result);
    } catch (err) {
      setError(err);
    } finally {
      setDiagnosing(false);
    }
  }

  async function handleDiagnosePhotoUploaded(uploaded: UploadedPhoto) {
    setDiagnosisResult(null);
    await runDiagnose(uploaded.downloadUrl, uploaded.storagePath);
  }

  async function handleConfirmDiagnoseNearLimit() {
    if (!pendingConfirmation) return;
    const { photoUrl, photoPath } = pendingConfirmation;
    setPendingConfirmation(null);
    await runDiagnose(photoUrl, photoPath, true);
  }

  if (error !== null) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <ErrorBlock error={error} title="Something went wrong" />
      </div>
    );
  }

  if (plant === null) {
    return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URLs */}
        <img
          src={plant.primaryPhotoUrl}
          alt={plant.nickname}
          className="h-56 w-full rounded-lg object-cover"
        />
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{plant.nickname}</h1>
            {plant.speciesCommonName && (
              <p className="text-sm text-gray-500">{plant.speciesCommonName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setConfirmDeletePlant(true)}
            className="text-sm text-red-600 hover:underline"
          >
            Delete plant
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <CareStatusBadge
            label="Water"
            status={getCareStatus(plant.lastWateredAt, plant.wateringIntervalDays)}
          />
          <CareStatusBadge
            label="Fertilize"
            status={getCareStatus(plant.lastFertilizedAt, plant.fertilizingIntervalDays)}
          />
          <CareStatusBadge
            label="Mist"
            status={getCareStatus(plant.lastMistedAt, plant.mistingIntervalDays)}
          />
        </div>
      </div>

      <section>
        <h2 className="font-medium text-gray-900">Log care</h2>
        <div className="mt-2">
          <CareEventButtons onLog={handleLog} />
        </div>
      </section>

      <section>
        <h2 className="font-medium text-gray-900">Care history</h2>
        <div className="mt-2">
          <CareEventHistory events={careEvents} onDelete={handleDeleteEvent} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Species</h2>
          {!editingSpecies && (
            <button
              type="button"
              onClick={() => setEditingSpecies(true)}
              className="text-sm text-blue-700 hover:underline"
            >
              Edit species
            </button>
          )}
        </div>
        {editingSpecies ? (
          <div className="mt-2 space-y-2">
            <input
              aria-label="Nickname"
              value={speciesForm.nickname}
              onChange={(e) => setSpeciesForm((f) => ({ ...f, nickname: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              aria-label="Common name"
              value={speciesForm.speciesCommonName}
              onChange={(e) => setSpeciesForm((f) => ({ ...f, speciesCommonName: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              aria-label="Scientific name"
              value={speciesForm.speciesScientificName}
              onChange={(e) =>
                setSpeciesForm((f) => ({ ...f, speciesScientificName: e.target.value }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              aria-label="Location"
              value={speciesForm.location}
              onChange={(e) => setSpeciesForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveSpecies}
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingSpecies(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-600">
            {plant.speciesScientificName || "Not set"}
            {plant.location ? ` · ${plant.location}` : ""}
          </p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Care schedule</h2>
          {!editingSchedule && (
            <button
              type="button"
              onClick={() => setEditingSchedule(true)}
              className="text-sm text-blue-700 hover:underline"
            >
              Edit schedule
            </button>
          )}
        </div>
        {editingSchedule ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input
              aria-label="Watering interval (days)"
              type="number"
              value={scheduleForm.wateringIntervalDays}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, wateringIntervalDays: e.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              aria-label="Fertilizing interval (days)"
              type="number"
              value={scheduleForm.fertilizingIntervalDays}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, fertilizingIntervalDays: e.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2"
            />
            <input
              aria-label="Misting interval (days)"
              type="number"
              value={scheduleForm.mistingIntervalDays}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, mistingIntervalDays: e.target.value }))
              }
              className="rounded-md border border-gray-300 px-3 py-2"
            />
            <div className="col-span-3 flex gap-2">
              <button
                type="button"
                onClick={handleSaveSchedule}
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingSchedule(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-600">
            Water every {plant.wateringIntervalDays ?? "—"} days · Fertilize every{" "}
            {plant.fertilizingIntervalDays ?? "—"} days · Mist every{" "}
            {plant.mistingIntervalDays ?? "—"} days
          </p>
        )}
      </section>

      <section>
        <h2 className="font-medium text-gray-900">Diagnose an issue</h2>
        <div className="mt-2 space-y-4">
          <PhotoUploader
            pathPrefix={`users/${user?.uid}/plants/${plantId}`}
            onUploaded={handleDiagnosePhotoUploaded}
          />
          {diagnosing && <p className="text-sm text-gray-500">Diagnosing…</p>}
          {diagnosisResult && <DiagnosisResultView result={diagnosisResult} />}
        </div>
      </section>

      {diagnoses.length > 0 && (
        <section>
          <h2 className="font-medium text-gray-900">Diagnosis history</h2>
          <ul className="mt-2 space-y-2">
            {diagnoses.map((d) => (
              <li key={d.id} className="rounded-md border border-gray-200 p-3 text-sm text-gray-700">
                {d.createdAt.toLocaleDateString()} — {d.suggestedTreatment}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmDeletePlant}
        destructive
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
      <PlantDetailContent plantId={plantId} />
    </AuthGuard>
  );
}
