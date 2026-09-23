"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { ArrowLeft, Sparkle, Drop, Flask, CloudFog } from "@phosphor-icons/react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { PhotoUploader, type UploadedPhoto } from "@/components/PhotoUploader";
import { Stepper } from "@/components/Stepper";
import { ErrorBlock } from "@/components/ErrorBlock";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createPlant } from "@/lib/firestore/plants";
import { addPlantPhoto } from "@/lib/firestore/photos";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { mapPlantDoc } from "@/lib/firestore/mappers";
import type { IdentificationResult } from "@/lib/openai/schemas";

const DEFAULT_LOCATIONS = ["Living room", "Bedroom", "Kitchen", "Office", "Bathroom"];
const LOW_CONFIDENCE_THRESHOLD = 0.5;

interface NearLimitState {
  tokensUsed: number;
  dailyLimit: number;
}

interface FormValues {
  nickname: string;
  speciesCommonName: string;
  speciesScientificName: string;
  wateringIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  mistingIntervalDays: number | null;
  location: string | null;
}

function careSummaryParagraph(summary: IdentificationResult["care_summary"]): string {
  return [summary.light, summary.water_frequency_guidance, summary.humidity, summary.notes]
    .filter((s) => s && s.trim().length > 0)
    .join(" ");
}

function AddPlantContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [tempId] = useState(() => crypto.randomUUID());
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [identification, setIdentification] = useState<IdentificationResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<NearLimitState | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);
  const [knownLocations, setKnownLocations] = useState<string[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [correctedName, setCorrectedName] = useState<string | null>(null);
  const [pendingSpecies, setPendingSpecies] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "plants"),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const locations = snapshot.docs
          .map((d) => mapPlantDoc(d.id, d.data()).location)
          .filter((l): l is string => Boolean(l));
        setKnownLocations(Array.from(new Set(locations)));
      }
    );
    return unsubscribe;
  }, [user]);

  const locationOptions = Array.from(new Set([...knownLocations, ...DEFAULT_LOCATIONS]));

  async function runIdentify(photoUrl: string, confirmNearLimit = false, speciesName?: string) {
    if (!user) return;
    setError(null);
    setIdentifying(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ photoUrl, confirmNearLimit, speciesName }),
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? `Request failed with status ${res.status}`);
      }
      if (json.requiresConfirmation) {
        setPendingSpecies(speciesName);
        setPendingConfirmation({ tokensUsed: json.tokensUsed, dailyLimit: json.dailyLimit });
        return;
      }
      const result = json.result as IdentificationResult;
      const previousCommonName = identification?.species_common_name;
      setIdentification(result);
      setCorrectedName(speciesName ?? null);
      setCorrecting(false);
      setCorrectionText("");
      // A correction re-suggests species and care only; keep the location and any nickname the user
      // already customised (i.e. one that isn't just the old guess).
      setValues((prev) => ({
        nickname:
          prev && prev.nickname !== previousCommonName
            ? prev.nickname
            : result.species_common_name || "My Plant",
        speciesCommonName: result.species_common_name,
        speciesScientificName: result.species_scientific_name,
        wateringIntervalDays: result.suggested_watering_interval_days,
        fertilizingIntervalDays: result.suggested_fertilizing_interval_days,
        mistingIntervalDays: result.suggested_misting_interval_days,
        location: prev?.location ?? null,
      }));
    } catch (err) {
      setError(err);
    } finally {
      setIdentifying(false);
    }
  }

  async function handlePhotoUploaded(uploaded: UploadedPhoto) {
    setPhoto(uploaded);
    setIdentification(null);
    setValues(null);
    setCorrecting(false);
    setCorrectedName(null);
    await runIdentify(uploaded.downloadUrl);
  }

  async function handleConfirmNearLimit() {
    if (!photo) return;
    setPendingConfirmation(null);
    await runIdentify(photo.downloadUrl, true, pendingSpecies);
  }

  async function handleCorrectionSubmit() {
    const name = correctionText.trim();
    if (!photo || !name) return;
    await runIdentify(photo.downloadUrl, false, name);
  }

  function handleRetake() {
    setPhoto(null);
    setIdentification(null);
    setValues(null);
    setError(null);
    setCorrecting(false);
    setCorrectedName(null);
  }

  async function handleSave() {
    if (!user || !photo || !values) return;
    setSaving(true);
    setError(null);
    try {
      const plantId = await createPlant(user.uid, {
        nickname: values.nickname,
        speciesCommonName: values.speciesCommonName || null,
        speciesScientificName: values.speciesScientificName || null,
        speciesConfidence: identification?.confidence ?? null,
        location: values.location,
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
    <div className="flex flex-col gap-[var(--space-4)] p-5">
      <div className="flex items-center gap-[var(--space-3)]">
        <button type="button" aria-label="Back" onClick={() => router.back()} className="btn btn-icon btn-secondary">
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ fontSize: 15, fontWeight: 500, margin: 0, flex: 1 }}>Add a plant</h1>
        <span className="text-tertiary" style={{ fontSize: 12 }}>
          {identification ? "Step 2 of 2" : "Step 1 of 2"}
        </span>
      </div>

      {!identification && (
        <div className="flex flex-col gap-[var(--space-3)]">
          <PhotoUploader pathPrefix={`users/${user?.uid}/plants/temp-${tempId}`} onUploaded={handlePhotoUploaded} />
          {identifying && (
            <div className="ai-loading-row">
              <Sparkle size={16} weight="fill" />
              Identifying…
            </div>
          )}
          {error !== null && <ErrorBlock error={error} title="Something went wrong" />}
        </div>
      )}

      {identification && values && (
        <div className="flex flex-col gap-[var(--space-4)]">
          <div className="flex items-start gap-[var(--space-3)]">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URL
              <img
                src={photo.downloadUrl}
                alt=""
                style={{ width: 132, height: 132, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none" }}
              />
            )}
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 kicker">
                <Sparkle size={12} weight="fill" />
                {correctedName ? "Corrected" : "Identified"}
              </span>
              <span style={{ fontSize: 20, fontWeight: 500 }}>{identification.species_scientific_name}</span>
              <span className="text-secondary" style={{ fontSize: 12 }}>
                {identification.species_common_name}
                {correctedName ? " · set by you" : ` · ${Math.round(identification.confidence * 100)}% confident`}
              </span>
              {!correcting && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ alignSelf: "flex-start", padding: 0, fontSize: 12 }}
                  onClick={() => {
                    setCorrectionText(correctedName ?? identification.species_common_name);
                    setCorrecting(true);
                  }}
                >
                  Not this plant? Correct it
                </button>
              )}
            </div>
          </div>

          {correcting && (
            <form
              className="field"
              onSubmit={(e) => {
                e.preventDefault();
                void handleCorrectionSubmit();
              }}
            >
              <label htmlFor="add-plant-correct-species">What plant is this?</label>
              <input
                id="add-plant-correct-species"
                className="input"
                value={correctionText}
                placeholder="e.g. Snake plant or Sansevieria trifasciata"
                onChange={(e) => setCorrectionText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-[var(--space-2)]">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={identifying || correctionText.trim().length === 0}
                >
                  {identifying ? "Updating…" : "Update plant"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setCorrecting(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-[var(--space-2)]">
            <div style={{ height: 3, borderRadius: 2, background: "color-mix(in srgb, var(--color-text) 12%, transparent)" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 2,
                  width: `${Math.round(identification.confidence * 100)}%`,
                  background: "var(--color-accent)",
                }}
              />
            </div>
            {!correctedName && identification.confidence < LOW_CONFIDENCE_THRESHOLD && (
              <p style={{ fontSize: 12, color: "var(--color-accent-300)", margin: 0 }}>
                Low confidence — double-check the details below, or retake the photo.
              </p>
            )}
          </div>

          <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6, margin: 0, opacity: 0.62 }}>
            {careSummaryParagraph(identification.care_summary)}
          </p>

          <div className="field">
            <label htmlFor="add-plant-nickname">Nickname</label>
            <input
              id="add-plant-nickname"
              className="input"
              value={values.nickname}
              onChange={(e) => setValues((v) => (v ? { ...v, nickname: e.target.value } : v))}
            />
          </div>

          <div className="flex flex-col gap-[var(--space-3)]">
            <div className="flex items-center justify-between">
              <span className="text-secondary" style={{ fontSize: 12, opacity: 0.7 }}>
                Suggested schedule
              </span>
              <span className="text-tertiary" style={{ fontSize: 11 }}>
                tap to adjust
              </span>
            </div>
            {(
              [
                { key: "wateringIntervalDays", label: "Water", icon: Drop },
                { key: "fertilizingIntervalDays", label: "Fertilize", icon: Flask },
                { key: "mistingIntervalDays", label: "Mist", icon: CloudFog },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between card">
                <span className="flex items-center gap-[var(--space-2)]">
                  <Icon size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
                  {label}
                </span>
                <Stepper
                  label={label}
                  value={values[key]}
                  onChange={(v) => setValues((f) => (f ? { ...f, [key]: v } : f))}
                />
              </div>
            ))}
          </div>

          <div className="seg">
            {locationOptions.map((loc) => (
              <label key={loc} className="seg-opt">
                <input
                  type="radio"
                  name="location"
                  checked={values.location === loc}
                  onChange={() => setValues((v) => (v ? { ...v, location: loc } : v))}
                />
                {loc}
              </label>
            ))}
          </div>

          {error !== null && <ErrorBlock error={error} title="Something went wrong" />}

          <div className="flex flex-col gap-[var(--space-2)]">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary btn-block"
              style={{ minHeight: 44 }}
            >
              {saving ? "Saving…" : "Save plant"}
            </button>
            <button type="button" onClick={handleRetake} className="btn btn-ghost btn-block">
              Not right — retake photo
            </button>
          </div>
        </div>
      )}

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
      <AppShell showTabBar={false}>
        <AddPlantContent />
      </AppShell>
    </AuthGuard>
  );
}
