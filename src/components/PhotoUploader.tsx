"use client";

import { useState, type ChangeEvent } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
  const [error, setError] = useState<unknown>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="photo-upload">
        Photo
      </label>
      <input
        id="photo-upload"
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-700 dark:text-gray-300"
      />
      {uploading && <p className="text-sm text-gray-500 dark:text-gray-400">Uploading…</p>}
      {error !== null && <ErrorBlock error={error} title="Photo upload failed" />}
    </div>
  );
}
