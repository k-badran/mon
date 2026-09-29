import { isSafeImageSrc } from "@mon/core";

import shippedImages from "./public-images.json";

/** Every file under public/images, listed at build time by build-image-manifest.mjs. */
const SHIPPED = new Set<string>(shippedImages);

/**
 * Whether a local path names a file the site actually ships.
 *
 * Remote URLs (an S3 upload) are taken on trust; a local one that is not in
 * the list is a row left behind by a design change that deleted its file.
 */
function exists(src: string): boolean {
  return !src.startsWith("/images/") || SHIPPED.has(src);
}

/**
 * The photo for an image slot: the dashboard's value, or the page's own file.
 *
 * Photos are `content_blocks` rows of kind "image" (seeded in
 * `packages/db/src/image-content.ts`). The fallback is the file the page
 * shipped with, so a database that predates those rows — or an unpublished
 * one — still shows the design's photo rather than a broken frame.
 *
 * The API already refuses anything but an `/images/...` path or an https URL;
 * the value is checked again here because it goes straight into an
 * `<img src>`, and a row written around the API must not reach a visitor.
 * A local path whose file is gone falls back too, rather than rendering a
 * broken image until someone edits the block.
 */
export function imageSrc(copy: Record<string, string>, slot: string, fallback: string): string;
export function imageSrc(
  copy: Record<string, string>,
  slot: string,
  fallback?: string,
): string | undefined;
export function imageSrc(
  copy: Record<string, string>,
  slot: string,
  fallback?: string,
): string | undefined {
  const value = copy[slot]?.trim();
  return value && isSafeImageSrc(value) && exists(value) ? value : fallback;
}
