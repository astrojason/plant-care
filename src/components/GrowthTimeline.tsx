"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Trash } from "@phosphor-icons/react";
import type { PlantPhoto } from "@/lib/types/plant";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorBlock } from "./ErrorBlock";

/** Growth photos only (identification/diagnosis shots are shown elsewhere). Shown once there
 *  are enough to fill a full row; the last four (newest last), rest behind "Show all". */
const MIN_PHOTOS_TO_SHOW = 4;

export function GrowthTimeline({
  photos,
  onAddPhoto,
  onDeletePhoto,
}: {
  photos: PlantPhoto[];
  onAddPhoto: (file: File) => Promise<void>;
  onDeletePhoto: (photo: PlantPhoto) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const growthPhotos = photos.filter((p) => p.photoType === "general");
  const sorted = [...growthPhotos].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const displayed = expanded ? sorted : sorted.slice(-4);
  const hiddenCount = sorted.length - displayed.length;
  const pendingDeletePhoto = sorted.find((p) => p.id === pendingDeleteId) ?? null;

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await onAddPhoto(file);
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeletePhoto) return;
    setPendingDeleteId(null);
    setDeleteError(null);
    try {
      await onDeletePhoto(pendingDeletePhoto);
    } catch (err) {
      setDeleteError(err);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-[var(--space-2)]">
        <h2 className="kicker">Growth timeline</h2>
        <div className="flex items-center gap-[var(--space-3)]">
          {hiddenCount > 0 && (
            <button type="button" onClick={() => setExpanded(true)} className="btn btn-ghost" style={{ fontSize: 11 }}>
              Show all
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn btn-ghost"
            style={{ fontSize: 11 }}
          >
            {uploading ? "Adding…" : "Add photo"}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleChange} />
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-secondary">No photos yet.</p>
      ) : sorted.length < MIN_PHOTOS_TO_SHOW ? (
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="growth-thumb-row">
            {sorted.map((photo) => (
              <div key={photo.id} className="growth-thumb" style={{ position: "relative" }}>
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => setPendingDeleteId(photo.id)}
                  className="btn btn-icon"
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, minWidth: 20 }}
                >
                  <Trash size={11} weight="regular" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URLs */}
                <img src={photo.downloadUrl} alt="" />
              </div>
            ))}
          </div>
          <p className="text-sm text-secondary">
            Add {MIN_PHOTOS_TO_SHOW - sorted.length} more photo{MIN_PHOTOS_TO_SHOW - sorted.length === 1 ? "" : "s"} to
            start a timeline.
          </p>
        </div>
      ) : (
        <div className="growth-timeline">
          {displayed.map((photo) => (
            <figure key={photo.id} className="growth-tile" style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Delete photo"
                onClick={() => setPendingDeleteId(photo.id)}
                className="btn btn-icon"
                style={{ position: "absolute", top: 4, right: 4 }}
              >
                <Trash size={14} weight="regular" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URLs */}
              <img src={photo.downloadUrl} alt="" />
              <figcaption>{photo.createdAt.toLocaleDateString(undefined, { month: "short" })}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {deleteError !== null && <ErrorBlock error={deleteError} title="Failed to delete photo" />}

      <ConfirmDialog
        open={pendingDeletePhoto !== null}
        title="Delete this photo?"
        description="This permanently removes the photo from this plant's growth timeline."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </section>
  );
}
