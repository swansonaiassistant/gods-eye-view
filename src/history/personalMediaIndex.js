/**
 * Pure client-side contract for future private, read-only media discovery.
 * No filesystem access, no automatic metadata upload and no sample user data.
 * A future authenticated local API will return this bounded public-to-the-viewer
 * subset after applying access policy on the server.
 */
export const PERSONAL_MEDIA_INDEX_VERSION = 1;
export const MAX_MEDIA_PAGE_SIZE = 200;
const MEDIA_KINDS = new Set(['photo', 'video']);
const LOCATION_SOURCES = new Set(['exif-gps', 'video-gps', 'manual', 'inferred']);
const LOCATION_CONFIDENCE = new Set(['precise', 'approximate']);

function inRange(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Reject invalid or missing geographic inputs rather than inventing a map pin. */
export function normalizeMediaLocation(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  if (!inRange(candidate.latitude, -90, 90) || !inRange(candidate.longitude, -180, 180)) return null;
  if (!LOCATION_SOURCES.has(candidate.source)) return null;
  if (!LOCATION_CONFIDENCE.has(candidate.confidence)) return null;
  const accuracyM = candidate.accuracyM;
  if (accuracyM != null && (!Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > 1000000)) return null;
  // Imported coordinates are only as trustworthy as their source metadata.
  return Object.freeze({
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    source: candidate.source,
    confidence: candidate.confidence,
    accuracyM: accuracyM ?? null,
  });
}

function safeIso(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

/**
 * Normalize ONLY fields the viewer needs; deliberately exclude source path,
 * filenames, EXIF notes, people, camera serial numbers and private URLs.
 * IDs are opaque API-issued handles, not file paths.
 */
export function normalizeMediaMapRecord(record) {
  if (!record || !MEDIA_KINDS.has(record.kind)
    || typeof record.id !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(record.id)) return null;
  const location = normalizeMediaLocation(record.location);
  if (!location) return null;
  return Object.freeze({
    id: record.id,
    kind: record.kind,
    location,
    capturedAt: safeIso(record.capturedAt),
    durationSeconds: record.kind === 'video' && inRange(record.durationSeconds, 0, 86400 * 7)
      ? record.durationSeconds : null,
    // One opaque identifier only; never accept an arbitrary remote thumbnail URL.
    thumbnailId: typeof record.thumbnailId === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(record.thumbnailId)
      ? record.thumbnailId : null,
  });
}

/**
 * Bounds always correspond to the CURRENT camera rectangle. No world-wide
 * dump on page load. A backend must independently validate these values.
 */
export function personalMediaViewportQuery(bounds, { limit = 100, cursor = null } = {}) {
  if (!bounds || !inRange(bounds.south, -90, 90) || !inRange(bounds.north, -90, 90)
    || !inRange(bounds.west, -180, 180) || !inRange(bounds.east, -180, 180)
    || bounds.south >= bounds.north || bounds.west >= bounds.east) return null;
  const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, MAX_MEDIA_PAGE_SIZE)) : 100;
  const params = new URLSearchParams({
    south: bounds.south.toFixed(6),
    north: bounds.north.toFixed(6),
    west: bounds.west.toFixed(6),
    east: bounds.east.toFixed(6),
    limit: String(boundedLimit),
  });
  if (typeof cursor === 'string' && /^[A-Za-z0-9_-]{1,256}$/.test(cursor)) params.set('cursor', cursor);
  return params;
}
