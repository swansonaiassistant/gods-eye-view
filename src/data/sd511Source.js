/** Verified official discovery URL, not an undocumented scraping API. */
export const SD511_SOURCE = Object.freeze({
  id: 'south-dakota-511',
  name: 'SD511 road conditions',
  homepage: 'https://www.sd511.org/',
  help: 'https://www.sd511.org/static/help.html',
  covers: ['road conditions', 'incidents', 'construction', 'cameras', 'travel weather'],
  apiVerified: false,
  liveStatus: 'not-connected',
});

/** Normalize an eventual licensed/open feed without inventing location or age. */
export function normalizeRoadEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id ?? raw.eventId ?? '').trim();
  const type = String(raw.type ?? raw.category ?? '').trim();
  const updatedAt = raw.updatedAt == null ? null : String(raw.updatedAt);
  const lon = Number(raw.longitude ?? raw.lon);
  const lat = Number(raw.latitude ?? raw.lat);
  if (!id || !type) return null;
  const position = Number.isFinite(lon) && Number.isFinite(lat)
    && lat >= 42.4 && lat <= 46.1 && lon >= -104.2 && lon <= -96.2 ? [lon, lat] : null;
  return { id, type, road: String(raw.road ?? ''), updatedAt, position, source: SD511_SOURCE.homepage };
}
