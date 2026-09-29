import { describe, expect, it } from "vitest";

import { IMAGE_UPLOAD_MAX_BYTES, checkImageUpload, detectImageFormat } from "../image-upload.js";

function bytes(...parts: Array<number[] | string>): Uint8Array {
  const flat: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") flat.push(...Array.from(part, (c) => c.charCodeAt(0)));
    else flat.push(...part);
  }
  return new Uint8Array(flat);
}

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "JFIF", [0x00]);
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13], "IHDR");
const WEBP = bytes("RIFF", [0x24, 0, 0, 0], "WEBPVP8 ");
// ftyp box of 28 bytes: major brand "avif", minor version, compatible brands.
const AVIF = bytes([0, 0, 0, 28], "ftyp", "avif", [0, 0, 0, 0], "avif", "mif1", "miaf");

describe("detectImageFormat", () => {
  it("recognises the four accepted formats by their signature", () => {
    expect(detectImageFormat(JPEG)).toMatchObject({ contentType: "image/jpeg", extension: "jpg" });
    expect(detectImageFormat(PNG)).toMatchObject({ contentType: "image/png", extension: "png" });
    expect(detectImageFormat(WEBP)).toMatchObject({ contentType: "image/webp", extension: "webp" });
    expect(detectImageFormat(AVIF)).toMatchObject({ contentType: "image/avif", extension: "avif" });
  });

  it("finds AVIF among the compatible brands, not only the major one", () => {
    const file = bytes([0, 0, 0, 24], "ftyp", "mif1", [0, 0, 0, 0], "miaf", "avif");
    expect(detectImageFormat(file)?.type).toBe("avif");
  });

  it("refuses SVG and other text, whatever the file is called", () => {
    expect(detectImageFormat(bytes('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toBeNull();
    expect(detectImageFormat(bytes('<?xml version="1.0"?><svg/>'))).toBeNull();
    expect(detectImageFormat(bytes("<!doctype html><script>alert(1)</script>"))).toBeNull();
  });

  it("refuses formats it does not serve", () => {
    expect(detectImageFormat(bytes("GIF89a", [1, 0, 1, 0]))).toBeNull();
    expect(detectImageFormat(bytes("%PDF-1.7"))).toBeNull();
    // HEIC shares AVIF's container; only the brand tells them apart.
    expect(detectImageFormat(bytes([0, 0, 0, 24], "ftyp", "heic", [0, 0, 0, 0], "mif1", "heic"))).toBeNull();
    // A RIFF file that is not WebP (a WAV).
    expect(detectImageFormat(bytes("RIFF", [0x24, 0, 0, 0], "WAVEfmt "))).toBeNull();
  });

  it("does not read past a truncated header", () => {
    expect(detectImageFormat(new Uint8Array())).toBeNull();
    expect(detectImageFormat(bytes([0xff, 0xd8]))).toBeNull();
    expect(detectImageFormat(bytes("RIFF"))).toBeNull();
    expect(detectImageFormat(bytes([0, 0, 0, 40], "ftyp"))).toBeNull();
  });
});

describe("checkImageUpload", () => {
  it("accepts an image within the limit", () => {
    expect(checkImageUpload(JPEG)).toMatchObject({ ok: true, format: { type: "jpeg" } });

    const atLimit = new Uint8Array(IMAGE_UPLOAD_MAX_BYTES);
    atLimit.set(PNG);
    expect(checkImageUpload(atLimit).ok).toBe(true);
  });

  it("rejects empty, oversized and unrecognised files", () => {
    expect(checkImageUpload(new Uint8Array())).toEqual({ ok: false, reason: "empty" });

    const tooBig = new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1);
    tooBig.set(JPEG);
    expect(checkImageUpload(tooBig)).toEqual({ ok: false, reason: "too_large" });

    expect(checkImageUpload(bytes("<svg/>"))).toEqual({ ok: false, reason: "unsupported_type" });
  });
});
