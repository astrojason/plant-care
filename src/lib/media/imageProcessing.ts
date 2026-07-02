const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export function isHeicFile(file: { type: string; name: string }): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.hei[cf]$/i.test(file.name);
}

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Converts HEIC/HEIF (iPhone default camera format) to JPEG so the image is
 * viewable in browsers and consumable by the OpenAI vision API. Real
 * browser/heic2any glue — exercised by the Playwright E2E suite rather than
 * jsdom unit tests, since jsdom doesn't implement the underlying decode path.
 */
async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
}

/**
 * Resizes to a max edge of 1600px and re-encodes as JPEG to bound Storage
 * and OpenAI vision token costs. Real canvas glue — see note above.
 */
async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = computeScaledDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available in this browser.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode the resized image."))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

export async function prepareImageForUpload(file: File): Promise<Blob> {
  const converted = await convertHeicIfNeeded(file);
  return resizeToJpeg(converted);
}
