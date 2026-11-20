// Black Hills region, south/west/north/east. Query bounds are intentionally
// regional, including Piedmont/Black Hawk, Nemo, Lead, Galena, and Mystic.
export const BLACK_HILLS_BBOX = '43.65,-104.35,44.85,-102.90';
const VALID_RAILWAY = new Set(['abandoned', 'disused', 'razed']);
const MAX_FEATURES = 12000;
const MAX_VERTICES = 300000;

export function overpassWaysToRailGeoJSON(payload) {
  if (!payload || !Array.isArray(payload.elements)) throw new Error('Invalid railway response');
  const features = [];
  let vertices = 0;
  for (const way of payload.elements) {
    if (way?.type !== 'way' || !VALID_RAILWAY.has(way.tags?.railway) || !Array.isArray(way.geometry)) continue;
    const coords = way.geometry
      .map((point) => [Number(point?.lon), Number(point?.lat)])
      .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat)
        && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90);
    if (coords.length < 2) continue;
    vertices += coords.length;
    if (features.length >= MAX_FEATURES || vertices > MAX_VERTICES) throw new Error('Railway response exceeds map safety limit');
    const tags = way.tags;
    features.push({
      type: 'Feature',
      id: `osm-way-${way.id}`,
      properties: {
        name: typeof tags.name === 'string' ? tags.name.slice(0, 140) : 'Historic railway alignment',
        railway: tags.railway,
        former_operator: String(tags.operator || tags['old_operator'] || '').slice(0, 140),
        source: 'OpenStreetMap contributors',
        source_url: `https://www.openstreetmap.org/way/${encodeURIComponent(String(way.id))}`,
        confidence: 'community-mapped, not survey-verified',
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
  return { type: 'FeatureCollection', features };
}
