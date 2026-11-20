/** Official NPS editorial assets. No private-person tracking or inferred positions. */
export const NPS_PEOPLE_PLACES = Object.freeze({
  apiBase: 'https://developer.nps.gov/api/v1',
  docs: 'https://www.nps.gov/subjects/developer/api-documentation.htm',
  getStarted: 'https://www.nps.gov/subjects/developer/get-started.htm',
  parkCodes: Object.freeze(['moru', 'wica', 'jeca', 'mimi', 'badl']),
  apiKeyRequired: true,
});

/** Build a bounded upstream URL. The key is sent only in the X-Api-Key header. */
export function npsQuery(kind, { parkCode = 'moru', limit = 50 } = {}) {
  if (!['people', 'places'].includes(kind)) throw new Error('Unsupported NPS resource');
  if (!NPS_PEOPLE_PLACES.parkCodes.includes(parkCode)) throw new Error('Unapproved park code');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Invalid NPS page limit');
  const url = new URL(`${NPS_PEOPLE_PLACES.apiBase}/${kind}`);
  url.searchParams.set('parkCode', parkCode);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('start', '0');
  return url.toString();
}

function safeText(value, max = 500) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeNpsUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && (url.hostname === 'nps.gov' || url.hostname.endsWith('.nps.gov')) ? url.toString() : null;
  } catch { return null; }
}

function sourcePosition(item) {
  if (['1', 'true', 'yes'].includes(String(item.isMapPinHidden ?? '').toLowerCase())) return null;
  if (['0', 'false', 'no'].includes(String(item.isOpenToPublic ?? '').toLowerCase())) return null;
  const lat = Number(item.latitude), lon = Number(item.longitude);
  if (!String(item.latitude ?? '').trim() || !String(item.longitude ?? '').trim()) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 42 || lat > 46 || lon < -106 || lon > -101) return null;
  return [lon, lat];
}

/** Normalize one official record; People are editorial cards only, never map pins. */
export function normalizePublicProfile(item, kind) {
  if (!item || typeof item !== 'object' || !['people', 'places'].includes(kind)) return null;
  const id = safeText(item.id, 100), name = safeText(item.title, 180), sourceUrl = safeNpsUrl(item.url);
  if (!id || !name || !sourceUrl) return null;
  return {
    id, kind, name, summary: safeText(item.listingDescription, 500), sourceUrl,
    position: kind === 'places' ? sourcePosition(item) : null,
    locationConfidence: kind === 'places' && sourcePosition(item) ? 'NPS supplied point; site extent and current access are not established' : null,
    isLiveTracking: false,
  };
}

/** Reject malformed responses rather than silently showing an empty official catalog. */
export function normalizeNpsResponse(payload, kind) {
  if (!payload || !Array.isArray(payload.data) || !['people', 'places'].includes(kind)) throw new Error('Invalid NPS response');
  return {
    total: Math.max(0, Number.parseInt(payload.total, 10) || 0),
    records: payload.data.slice(0, 50).map((item) => normalizePublicProfile(item, kind)).filter(Boolean),
  };
}
