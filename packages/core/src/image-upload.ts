/**
 * Which uploaded files the dashboard may put on the public pages.
 *
 * An upload ends up in an `<img src>` served from our own storage, so its type
 * is decided by what the bytes are, never by the name or the `Content-Type` the
 * browser sent — both are whatever the client says they are. A file that
 * claims to be a JPEG and is really an SVG would be served back as whatever we
 * label it, and an SVG can carry script. So only four raster formats are
 * recognised, each by its signature, and everything else is refused.
 *
 * Shared by the API, which enforces it, and the dashboard, which checks the
 * size before spending an 8 MB round trip on a file that would be refused.
 */

export type UploadImageType = "jpeg" | "png" | "webp" | "avif";

export interface UploadImageFormat {
  type: UploadImageType;
  contentType: string;
  extension: string;
}

/** Large enough for a full-width hero photo, small enough to keep pages fast. */
export const IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

/** What the file picker offers; the server does not trust it. */
export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

const FORMATS: Record<UploadImageType, UploadImageFormat> = {
  jpeg: { type: "jpeg", contentType: "image/jpeg", extension: "jpg" },
  png: { type: "png", contentType: "image/png", extension: "png" },
  webp: { type: "webp", contentType: "image/webp", extension: "webp" },
  avif: { type: "avif", contentType: "image/avif", extension: "avif" },
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/**
 * The image format the bytes actually are, or null for anything not accepted.
 *
 * Only the leading bytes are examined; that is enough to tell these formats
 * apart and to refuse text formats (SVG, HTML), which have no binary signature.
 */
export function detectImageFormat(bytes: Uint8Array): UploadImageFormat | null {
  // JPEG: SOI marker followed by the start of another marker.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return FORMATS.jpeg;

  if (startsWith(bytes, PNG_SIGNATURE)) return FORMATS.png;

  // WebP: a RIFF container whose form type is "WEBP".
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return FORMATS.webp;
  }

  // AVIF: an ISO-BMFF `ftyp` box whose major or compatible brands name AVIF.
  // HEIC shares the container, so the brand is what separates them — and a
  // HEIC photo would not render in most browsers.
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const boxSize =
      ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
    const end = Math.min(boxSize, bytes.length);

    for (let offset = 8; offset + 4 <= end; offset += 4) {
      // Offset 12 is the minor version, not a brand.
      if (offset === 12) continue;
      const brand = ascii(bytes, offset, 4);
      if (brand === "avif" || brand === "avis") return FORMATS.avif;
    }
  }

  return null;
}

export type ImageUploadRejection = "empty" | "too_large" | "unsupported_type";

/** Checks an upload against the size and type rules; the format when it passes. */
export function checkImageUpload(
  bytes: Uint8Array,
): { ok: true; format: UploadImageFormat } | { ok: false; reason: ImageUploadRejection } {
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > IMAGE_UPLOAD_MAX_BYTES) return { ok: false, reason: "too_large" };

  const format = detectImageFormat(bytes);
  return format ? { ok: true, format } : { ok: false, reason: "unsupported_type" };
}
