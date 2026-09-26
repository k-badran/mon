import { env } from "@mon/config";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { redis } from "../../lib/redis.js";

/**
 * Server-side geocoding.
 *
 * The legacy app called Nominatim directly from every visitor's browser on
 * each keystroke: no API key, no identifying User-Agent, no caching and no
 * rate limiting. Nominatim's policy allows roughly one request per second and
 * blocks traffic like that — at which point address entry and distance
 * calculation both stop working for everyone.
 *
 * Proxying it here gives one identified caller, a shared cache, and a rate
 * limit we control. It also means the client cannot assert a shorter distance
 * to lower its own price.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // addresses do not move
const REQUEST_TIMEOUT_MS = 5000;

/** The company only operates with an origin in North Rhine-Westphalia. */
const SERVICE_AREA_STATE = "Nordrhein-Westfalen";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  state: string;
  country: string;
  displayName: string;
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const cacheKey = `geo:${normalized}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    return JSON.parse(cached) as GeocodeResult;
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("q", query);

  const response = await fetchWithTimeout(url, {
    // Nominatim's policy requires an identifying User-Agent with contact info.
    headers: { "User-Agent": env.GEOCODING_USER_AGENT, "Accept-Language": "de" },
  });

  if (!response.ok) {
    logger.error({ status: response.status }, "Geocoding provider returned an error");
    throw new AppError("SERVICE_UNAVAILABLE", 503, "Address lookup is unavailable right now.");
  }

  const payload = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { state?: string; country?: string };
  }>;

  const first = payload[0];

  if (!first) {
    throw AppError.unprocessable("That address could not be found.");
  }

  const result: GeocodeResult = {
    latitude: Number.parseFloat(first.lat),
    longitude: Number.parseFloat(first.lon),
    state: first.address?.state ?? "",
    country: first.address?.country ?? "",
    displayName: first.display_name,
  };

  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS).catch(() => undefined);

  return result;
}

/** Enforced server-side; the legacy check was a string match in the browser. */
export function assertWithinServiceArea(result: GeocodeResult): void {
  if (!result.state.includes(SERVICE_AREA_STATE)) {
    throw AppError.unprocessable(
      `The starting address must be in ${SERVICE_AREA_STATE}.`,
    );
  }
}

/**
 * Distance between two addresses.
 *
 * NOTE: this is a great-circle distance, which under-reports real driving
 * distance by roughly 20-30% and therefore under-prices long moves. It is a
 * deliberate placeholder — swap in a routing provider (OSRM, Valhalla, or a
 * commercial Directions API) before charging for distance in production. The
 * multiplier below is a crude correction, not a substitute.
 */
const ROAD_DISTANCE_MULTIPLIER = 1.25;

export async function estimateDistanceKm(origin: string, destination: string): Promise<number> {
  const [from, to] = await Promise.all([geocode(origin), geocode(destination)]);

  assertWithinServiceArea(from);

  const straightLine = haversineKm(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
  );

  return Math.round(straightLine * ROAD_DISTANCE_MULTIPLIER * 100) / 100;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const EARTH_RADIUS_KM = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchWithTimeout(url: URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("SERVICE_UNAVAILABLE", 503, "Address lookup timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
