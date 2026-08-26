"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { storage } from "@/lib/firebase/client";
import { prepareImageForUpload } from "@/lib/media/imageProcessing";
import { ErrorBlock } from "./ErrorBlock";

export interface UploadedPhoto {
  storagePath: string;
  downloadUrl: string;
}

/**
 * pathPrefix is the Storage folder to upload into, e.g.
 * `users/{uid}/plants/{plantId}` (or a temp id during the add-plant flow,
 * before a plant document exists).
 */
export function PhotoUploader({
  pathPrefix,
  onUploaded,
}: {
  pathPrefix: string;
  onUploaded: (photo: UploadedPhoto) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const processed = await prepareImageForUpload(file);
      const storagePath = `${pathPrefix}/${crypto.randomUUID()}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, processed, { contentType: "image/jpeg" });
      const downloadUrl = await getDownloadURL(storageRef);
      onUploaded({ storagePath, downloadUrl });
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void handleFile(file);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <label htmlFor="photo-upload" className="sr-only">
        Photo
      </label>
      <label
        htmlFor="photo-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-dashed p-[var(--space-6)] text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragActive || uploading ? "var(--color-accent)" : "var(--color-divider)",
          color: uploading ? "var(--color-accent)" : "var(--text-secondary)",
        }}
      >
        <ImageIcon size={28} weight="regular" />
        <span className="text-sm">
          {uploading ? "Uploading…" : "Take a photo or choose one"}
        </span>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>
      {error !== null && <ErrorBlock error={error} title="Photo upload failed" />}
    </div>
  );
}
