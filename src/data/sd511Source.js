/** South Dakota's public XML ZIP, documented as state-provided to Northwest Passage. */
export const SD511_SOURCE = Object.freeze({
  id: 'south-dakota-511',
  name: 'South Dakota 511 public reports',
  homepage: 'https://www.sd511.org/',
  help: 'https://www.sd511.org/static/help.html',
  feed: 'https://sd.cdn.iteris-atis.com/xml/511.zip',
  apiPath: '/api/sd511',
  refreshMs: 5 * 60 * 1000,
  publicFeedVerified: true,
  camerasAvailableInFeed: false,
});

const CATEGORIES = new Set(['conditions', 'closure', 'construction', 'restrictions', 'vehicle_restrictions', 'event', 'incident']);
const direct = (node, name) => node && [...node.children].find((child) => child.tagName === name) || null;
const text = (node, name) => direct(node, name)?.textContent?.trim() || '';
const children = (node, name) => node ? [...node.children].filter((child) => child.tagName === name) : [];
const clean = (value, max = 180) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function parsePoint(node) {
  if (!node) return null;
  const latText = text(node, 'lat');
  const lonText = text(node, 'lon');
  if (!latText || !lonText) return null;
  const lat = Number(latText), lon = Number(lonText);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 42.4 && lat <= 46.1
    && lon >= -104.2 && lon <= -96.2 ? [lon, lat] : null;
}
function parseTime(node, name) {
  const seconds = Number(text(direct(node, name), 'unixtime'));
  return Number.isInteger(seconds) && seconds >= 946684800 && seconds < 4102444800
    ? seconds * 1000 : null;
}

/** Normalize a public report at an official route start/end, never invented road geometry. */
export function normalizeRoadEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = clean(raw.id, 50);
  const categories = Array.isArray(raw.categories)
    ? [...new Set(raw.categories.filter((value) => CATEGORIES.has(value)))] : [];
  const route = clean(raw.route, 80);
  const start = Array.isArray(raw.start) && raw.start.length === 2
    ? parseCoordinatePair(raw.start) : null;
  const end = Array.isArray(raw.end) && raw.end.length === 2
    ? parseCoordinatePair(raw.end) : null;
  if (!/^\d{1,16}(?::\d{1,2})?$/.test(id) || !categories.length || !route || (!start && !end)) return null;
  const validTime = (value) => Number.isFinite(value) && value >= 946684800000 && value < 4102444800000 ? value : null;
  return {
    id, categories, route, direction: clean(raw.direction, 30),
    description: clean(raw.description, 240), restrictions: clean(raw.restrictions, 240),
    start, end, reportedAt: validTime(raw.reportedAt),
    updatedAt: validTime(raw.updatedAt), source: SD511_SOURCE.homepage,
    locationNote: 'Official route endpoints only; no road-path geometry supplied.',
  };
}
function parseCoordinatePair(pair) {
  const [lon, lat] = pair;
  return Number.isFinite(lon) && Number.isFinite(lat) && lat >= 42.4 && lat <= 46.1
    && lon >= -104.2 && lon <= -96.2 ? [lon, lat] : null;
}

/** Parse only the documented SD511 XML shape, bounded before Cesium rendering. */
export function parseSd511Xml(xml, Parser = globalThis.DOMParser) {
  if (typeof xml !== 'string' || xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new Error('Invalid SD511 XML');
  }
  if (!Parser) throw new Error('XML parser unavailable');
  const doc = new Parser().parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  if (root?.tagName !== 'SDDOT' || doc.querySelector('parsererror')) throw new Error('Invalid SD511 XML root');
  const items = children(root, 'item');
  if (items.length > 500) throw new Error('SD511 feed exceeds safe item limit');
  const reports = [];
  for (const item of items) {
    if (text(item, 'status') !== 'active') continue;
    const id = text(item, 'id');
    const categories = children(direct(item, 'categories'), 'category')
      .map((category) => text(category, 'name'));
    const descriptions = children(direct(item, 'descriptions'), 'description')
      .slice(0, 6).map((d) => [text(d, 'phrase'), text(d, 'extent')].filter(Boolean).join(' · ')).filter(Boolean);
    const restrictions = children(direct(item, 'restrictions'), 'restriction')
      .slice(0, 6).map((r) => [text(r, 'phrase'), text(r, 'discrete_value')].filter(Boolean).join(' ')).filter(Boolean);
    const times = direct(item, 'time');
    const locations = children(direct(item, 'locations'), 'location');
    if (locations.length > 12 || reports.length + locations.length > 800) throw new Error('SD511 feed exceeds safe location limit');
    for (const [index, location] of locations.entries()) {
      const report = normalizeRoadEvent({
        id: `${id}:${index}`, categories, route: text(location, 'route'), direction: text(location, 'direction'),
        description: descriptions.join('; '), restrictions: restrictions.join('; '),
        start: parsePoint(direct(location, 'start')), end: parsePoint(direct(location, 'end')),
        reportedAt: parseTime(times, 'announce') || parseTime(times, 'start'),
        updatedAt: parseTime(times, 'update'),
      });
      if (report) reports.push(report);
    }
  }
  return reports;
}
