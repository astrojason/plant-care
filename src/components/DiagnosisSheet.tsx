"use client";

import { X, CalendarCheck, Sparkle, ArrowsClockwise } from "@phosphor-icons/react";
import type { DiagnosisResult } from "@/lib/openai/schemas";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";
import { ErrorBlock } from "./ErrorBlock";

const URGENCY_COPY: Record<DiagnosisResult["urgency"], string> = {
  low: "Worth watching",
  medium: "Needs attention this week",
  high: "Act today",
};

const CARE_TYPE_COPY: Record<NonNullable<DiagnosisResult["schedule_adjustment"]>["care_type"], string> = {
  watering: "Watering",
  fertilizing: "Fertilizing",
  misting: "Misting",
};

function summarize(result: DiagnosisResult): string {
  if (result.detected_issues.length === 0) {
    return "No issues detected — this plant looks healthy.";
  }
  const top = [...result.detected_issues].sort((a, b) => b.confidence - a.confidence)[0];
  return `${top.issue} suspected.`;
}

export function DiagnosisSheet({
  plantName,
  pathPrefix,
  photoUrl,
  diagnosing,
  result,
  saving,
  saved,
  readOnly = false,
  error,
  onPhotoUploaded,
  onClose,
  onSave,
}: {
  plantName: string;
  pathPrefix: string;
  photoUrl: string | null;
  diagnosing: boolean;
  result: DiagnosisResult | null;
  saving: boolean;
  saved: boolean;
  /** Viewing a previously saved diagnosis: hides the follow-up / save actions. */
  readOnly?: boolean;
  error?: unknown;
  onPhotoUploaded: (photo: UploadedPhoto) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const steps = result?.treatment_steps?.length
    ? result.treatment_steps
    : result
      ? [{ action: result.suggested_treatment, timing: "Now" }]
      : [];
  const followUpDays = result?.follow_up_days ?? 7;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${plantName} diagnosis`}
        className="dialog"
        style={{ width: "min(520px, 100%)", maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <button type="button" aria-label="Close" onClick={onClose} className="btn btn-icon btn-secondary">
            <X size={16} />
          </button>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{plantName} · diagnosis</h2>
        </div>

        {result === null ? (
          <div className="flex flex-col gap-[var(--space-4)]">
            <p className="text-secondary" style={{ fontSize: 14, margin: 0 }}>
              Take a photo of what&apos;s wrong, and we&apos;ll take a look.
            </p>
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URL
              <img src={photoUrl} alt="" style={{ width: "100%", maxHeight: 220, borderRadius: "var(--radius-md)", objectFit: "cover" }} />
            )}
            {diagnosing ? (
              <div className="ai-loading-row">
                <Sparkle size={16} weight="fill" />
                Reading the photo…
              </div>
            ) : (
              <PhotoUploader pathPrefix={pathPrefix} onUploaded={onPhotoUploaded} />
            )}
            {error !== undefined && error !== null && <ErrorBlock error={error} title="Diagnosis failed" />}
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--space-4)]">
            <div className="flex items-start gap-[var(--space-3)]">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URL
                <img
                  src={photoUrl}
                  alt=""
                  style={{ width: 74, height: 74, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none" }}
                />
              ) : (
                <div className="placeholder-tile" style={{ width: 74, height: 74, borderRadius: "var(--radius-md)" }} />
              )}
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }}
                  />
                  <span className="kicker">{URGENCY_COPY[result.urgency]}</span>
                </span>
                <p style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}>{summarize(result)}</p>
              </div>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.65, opacity: 0.78, margin: 0 }}>{result.overall_assessment}</p>

            {result.detected_issues.length > 0 && (
              <div className="flex flex-col gap-[var(--space-2)]">
                {result.detected_issues.map((issue, i) => (
                  <div
                    key={i}
                    className="card"
                    style={{
                      boxShadow: `inset 3px 0 0 ${
                        issue.confidence < 0.5 ? "color-mix(in srgb, var(--color-accent) 45%, transparent)" : "var(--color-accent)"
                      }`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{issue.issue}</span>
                      <span className="text-tertiary" style={{ fontSize: 11 }}>
                        {Math.round(issue.confidence * 100)}% confident
                      </span>
                    </div>
                    <p className="text-secondary" style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                      {issue.symptoms_observed.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-[var(--space-3)]">
              <h3 className="kicker" style={{ margin: 0 }}>
                What to do
              </h3>
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-[var(--space-3)]">
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 22,
                      height: 22,
                      flex: "none",
                      borderRadius: "50%",
                      border: "1px solid var(--color-accent)",
                      color: "var(--color-accent)",
                      fontSize: 11,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p style={{ fontSize: 14, lineHeight: 1.45, margin: 0 }}>{step.action}</p>
                    <p className="text-secondary" style={{ fontSize: 12, margin: 0 }}>
                      {step.timing}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-[var(--space-3)]"
              style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}
            >
              <CalendarCheck size={18} weight="regular" style={{ color: "var(--color-accent)", flex: "none" }} />
              <p style={{ fontSize: 13, flex: 1, margin: 0 }}>
                Check back in <strong>{followUpDays} days</strong> with a new photo
              </p>
              <button type="button" className="btn btn-secondary" disabled title="Reminders aren't wired up yet">
                Remind me
              </button>
            </div>

            {result.schedule_adjustment && !readOnly && (
              <div
                className="flex items-center gap-[var(--space-3)]"
                style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}
              >
                <ArrowsClockwise size={18} weight="regular" style={{ color: "var(--color-accent)", flex: "none" }} />
                <p style={{ fontSize: 13, flex: 1, margin: 0 }}>
                  {CARE_TYPE_COPY[result.schedule_adjustment.care_type]} will change to every{" "}
                  <strong>{result.schedule_adjustment.suggested_interval_days} days</strong> when you save —{" "}
                  {result.schedule_adjustment.reason}
                </p>
              </div>
            )}

            <p className="text-tertiary" style={{ fontSize: 11 }}>
              AI-generated estimate from one photo. For a rare or valuable plant, get a specialist to look.
            </p>

            {error !== undefined && error !== null && <ErrorBlock error={error} title="Failed to save diagnosis" />}

            {!readOnly && (
            <div className="dialog-actions" style={{ justifyContent: "space-between" }}>
              <button type="button" className="btn btn-secondary" disabled title="Not available yet">
                Ask a follow-up
              </button>
              <button type="button" className="btn btn-primary" disabled={saving || saved} onClick={onSave}>
                {saved ? "Saved" : saving ? "Saving…" : "Save to plant"}
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
