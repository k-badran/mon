import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { uploadStorage, type UploadStorage } from "@mon/config";
import type { UploadImageFormat } from "@mon/core";

import { AppError } from "./errors.js";

/**
 * Puts dashboard photo uploads into S3 and says where the public can read them.
 *
 * The API holds the credentials and the browser never does: the file comes to
 * the API, is checked, and only then written. A presigned browser-to-bucket
 * upload would skip that check — the bucket cannot tell an SVG from a JPEG —
 * and would need a CORS rule on the bucket besides.
 */

const resolved = uploadStorage();

let client: S3Client | null = null;

function s3(storage: UploadStorage): S3Client {
  client ??= new S3Client({
    region: storage.region,
    credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey },
    // S3-compatible stores are addressed by path; AWS itself by bucket host.
    ...(storage.endpoint ? { endpoint: storage.endpoint, forcePathStyle: true } : {}),
  });

  return client;
}

export const uploadsEnabled = resolved.enabled;

/** The 503 for a deployment without storage, naming what to set. */
export function uploadsUnavailable(): AppError {
  const missing = resolved.enabled ? [] : resolved.missing;
  return new AppError(
    "SERVICE_UNAVAILABLE",
    503,
    `Photo uploads are not configured. Set ${missing.join(", ")} on the API.`,
  );
}

/**
 * Where a new upload is stored.
 *
 * Dated folders keep the bucket browsable by hand; the random name makes every
 * object unique, which is what lets it be cached as immutable, and means an
 * upload can never overwrite a photo a page already shows.
 */
export function uploadKey(format: UploadImageFormat, now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `uploads/${year}/${month}/${randomUUID()}.${format.extension}`;
}

export async function storeImage(
  body: Buffer,
  format: UploadImageFormat,
): Promise<{ key: string; url: string }> {
  if (!resolved.enabled) throw uploadsUnavailable();

  const { storage } = resolved;
  const key = uploadKey(format);

  await s3(storage).send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: body,
      // The detected type, never the one the browser claimed — this header is
      // what the bucket serves the file back with.
      ContentType: format.contentType,
      // A year, immutable: the name is never reused, so a cached copy can
      // never be stale.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return { key, url: `${storage.publicBaseUrl}/${key}` };
}
