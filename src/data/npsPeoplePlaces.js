/** Public historical/editorial content only; not tracking private people. */
export const NPS_PEOPLE_PLACES = Object.freeze({
  apiBase: 'https://developer.nps.gov/api/v1',
  docs: 'https://www.nps.gov/subjects/digital/nps-data-api.htm',
  parkCodes: ['moru', 'wica', 'jeca', 'mimi', 'badl'],
  apiKeyRequired: true,
});
export function npsQuery(kind, apiKey, { parkCode = 'moru', limit = 50 } = {}) {
  if (!['people','places'].includes(kind)) throw new Error('Unsupported NPS resource');
  if (!NPS_PEOPLE_PLACES.parkCodes.includes(parkCode)) throw new Error('Unapproved park code');
  if (!apiKey) throw new Error('NPS API key required');
  const url = new URL(NPS_PEOPLE_PLACES.apiBase + '/' + kind);
  url.searchParams.set('parkCode', parkCode);
  url.searchParams.set('limit', String(Math.min(100,Math.max(1,Math.trunc(limit)))));
  url.searchParams.set('api_key', apiKey);
  return url.toString();
}
export function normalizePublicProfile(item) {
  if (!item || !item.id || !item.title) return null;
  const lat = Number(item.latitude), lon = Number(item.longitude);
  const position = item.latitude !== undefined && item.longitude !== undefined && Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= 42 && lat <= 46 && lon >= -106 && lon <= -101 ? [lon,lat] : null;
  return { id:String(item.id), name:String(item.title), summary:String(item.listingDescription ?? ''),
    sourceUrl:String(item.url ?? ''), position, isLiveTracking:false };
}
