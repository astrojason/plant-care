"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { PlantPhoto } from "@/lib/types/plant";

/** Growth photos only (identification/diagnosis shots are shown elsewhere). Shown once there
 *  are enough to fill a full row; the last four (newest last), rest behind "Show all". */
const MIN_PHOTOS_TO_SHOW = 4;

export function GrowthTimeline({
  photos,
  onAddPhoto,
}: {
  photos: PlantPhoto[];
  onAddPhoto: (file: File) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const growthPhotos = photos.filter((p) => p.photoType === "general");
  const sorted = [...growthPhotos].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const displayed = expanded ? sorted : sorted.slice(-4);
  const hiddenCount = sorted.length - displayed.length;

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

      {sorted.length < MIN_PHOTOS_TO_SHOW ? (
        <p className="text-sm text-secondary">
          {sorted.length === 0
            ? "No photos yet."
            : `Add ${MIN_PHOTOS_TO_SHOW - sorted.length} more photo${MIN_PHOTOS_TO_SHOW - sorted.length === 1 ? "" : "s"} to start a timeline.`}
        </p>
      ) : (
        <div className="growth-timeline">
          {displayed.map((photo) => (
            <figure key={photo.id} className="growth-tile">
              {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URLs */}
              <img src={photo.downloadUrl} alt="" />
              <figcaption>{photo.createdAt.toLocaleDateString(undefined, { month: "short" })}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
