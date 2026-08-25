"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { PhotoUploader, type UploadedPhoto } from "@/components/PhotoUploader";
import {
  IdentificationResultView,
  type IdentificationFormValues,
} from "@/components/IdentificationResult";
import { ErrorBlock } from "@/components/ErrorBlock";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createPlant } from "@/lib/firestore/plants";
import { addPlantPhoto } from "@/lib/firestore/photos";
import type { IdentificationResult } from "@/lib/openai/schemas";

interface NearLimitState {
  tokensUsed: number;
  dailyLimit: number;
}

function AddPlantContent() {
  const { user } = useAuth();
  const router = useRouter();
  // Stable per-mount temp folder id — Date.now() must not be called during
  // render (React purity rule), so it's generated once via lazy useState init.
  const [tempId] = useState(() => crypto.randomUUID());
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [identification, setIdentification] = useState<IdentificationResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<NearLimitState | null>(null);

  async function runIdentify(photoUrl: string, confirmNearLimit = false) {
    if (!user) return;
    setError(null);
    setIdentifying(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ photoUrl, confirmNearLimit }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? `Request failed with status ${res.status}`);
      }
      if (json.requiresConfirmation) {
        setPendingConfirmation({ tokensUsed: json.tokensUsed, dailyLimit: json.dailyLimit });
        return;
      }
      setIdentification(json.result);
    } catch (err) {
      setError(err);
    } finally {
      setIdentifying(false);
    }
  }

  async function handlePhotoUploaded(uploaded: UploadedPhoto) {
    setPhoto(uploaded);
    setIdentification(null);
    await runIdentify(uploaded.downloadUrl);
  }

  async function handleConfirmNearLimit() {
    if (!photo) return;
    setPendingConfirmation(null);
    await runIdentify(photo.downloadUrl, true);
  }

  async function handleSave(values: IdentificationFormValues) {
    if (!user || !photo) return;
    setSaving(true);
    setError(null);
    try {
      const plantId = await createPlant(user.uid, {
        nickname: values.nickname,
        speciesCommonName: values.speciesCommonName || null,
        speciesScientificName: values.speciesScientificName || null,
        speciesConfidence: identification?.confidence ?? null,
        location: null,
        primaryPhotoUrl: photo.downloadUrl,
        wateringIntervalDays: values.wateringIntervalDays,
        fertilizingIntervalDays: values.fertilizingIntervalDays,
        mistingIntervalDays: values.mistingIntervalDays,
      });
      await addPlantPhoto(user.uid, plantId, photo.storagePath, photo.downloadUrl, "identification");
      router.replace(`/plants/${plantId}`);
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Add a plant</h1>
      <div className="mt-6 space-y-6">
        <PhotoUploader
          pathPrefix={`users/${user?.uid}/plants/temp-${tempId}`}
          onUploaded={handlePhotoUploaded}
        />
        {identifying && <p className="text-sm text-gray-500 dark:text-gray-400">Identifying…</p>}
        {error !== null && <ErrorBlock error={error} title="Something went wrong" />}
        {identification && (
          <IdentificationResultView result={identification} onConfirm={handleSave} />
        )}
        {saving && <p className="text-sm text-gray-500 dark:text-gray-400">Saving…</p>}
      </div>
      <ConfirmDialog
        open={pendingConfirmation !== null}
        title="Near today's AI budget"
        description={
          pendingConfirmation
            ? `${pendingConfirmation.tokensUsed.toLocaleString()} / ${pendingConfirmation.dailyLimit.toLocaleString()} tokens used today (across all apps). Proceed anyway?`
            : undefined
        }
        confirmLabel="Proceed"
        onConfirm={handleConfirmNearLimit}
        onCancel={() => setPendingConfirmation(null)}
      />
    </div>
  );
}

export default function AddPlantPage() {
  return (
    <AuthGuard>
      <AddPlantContent />
    </AuthGuard>
  );
}
