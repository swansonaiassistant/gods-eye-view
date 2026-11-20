import * as Cesium from 'cesium';

const BASEROW_VIEW = 'd9YEH8ejNFzMkpXo8SYjydyLrgx8kLD1u0Bh2C1O5iU';
const BASEROW_API = `https://api.baserow.io/api/database/views/${BASEROW_VIEW}/public/info/`;
const BASEROW_ROWS = `https://api.baserow.io/api/database/views/grid/${BASEROW_VIEW}/public/rows/`;
const PAGE_SIZE = 200;
const MAX_PAGES = 5; // Bounded recent window; never imply this is the full public archive.

export const CALL_LOG_SOURCES = Object.freeze({
  rapidCity: Object.freeze({
    id: 'rapid-city-police-calls', name: 'Rapid City Police Calls', icon: '🚓',
    source: 'Rapid City Police · public call log', updateInterval: 4 * 60 * 60 * 1000,
    pageUrl: `https://baserow.io/public/grid/${BASEROW_VIEW}`,
    infoEndpoint: BASEROW_API, rowsEndpoint: BASEROW_ROWS, color: '#39c6ff',
  }),
  pennington: Object.freeze({
    id: 'pennington-county-sheriff-calls', name: 'Pennington Sheriff Calls', icon: '🚨',
    source: 'Pennington County Sheriff · public call log', updateInterval: 5 * 60 * 1000,
    pageUrl: 'https://www.pennco.org/law_public_safety/sheriffs_office/about/call_for_service_log.php',
    infoEndpoint: null, rowsEndpoint: null, color: '#ffc06e',
  }),
});

const REQUIRED_FIELDS = Object.freeze([
  'CFS Date/Time', 'Street Name', 'Nearest Intersection', 'CFS #', 'Call Type', 'Disposition',
]);
const canon = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Baserow's public-rows API returns field_ IDs even with user_field_names=true. */
export function publicFieldMap(info) {
  if (!Array.isArray(info?.fields)) throw new Error('Baserow public field metadata is missing');
  const map = new Map();
  for (const item of info.fields) {
    if (Number.isInteger(item?.id) && typeof item?.name === 'string') {
      map.set(canon(item.name), `field_${item.id}`);
    }
  }
  for (const name of REQUIRED_FIELDS) {
    if (!map.has(canon(name))) throw new Error(`Baserow public field missing: ${name}`);
  }
  return map;
}

function field(row, names, fields) {
  for (const name of names) {
    const key = fields?.get(canon(name));
    if (key && row[key] != null) return String(row[key]).trim();
    const direct = Object.keys(row).find((candidate) => canon(candidate) === canon(name));
    if (direct && row[direct] != null) return String(row[direct]).trim();
  }
  return '';
}

export function parseReportedCoordinates(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  return localCoordinates(lat, lon) ? { lat, lon } : null;
}

function localCoordinates(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= 43.5 && lat <= 44.6 && lon >= -104.5 && lon <= -102.4;
}

export function nearestIntersection(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().replace(/\s*\([^)]*\)\s*$/, '');
  const match = clean.match(/^([A-Z0-9 .'-]{3,60})\s+and\s+([A-Z0-9 .'-]{3,60})$/i);
  if (!match || canon(match[1]) === canon(match[2])) return null;
  return `${match[1].trim()} & ${match[2].trim()}`;
}

export function normalizeRapidCityRow(row, fields = null) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const callNumber = field(row, ['CFS #'], fields);
  const time = field(row, ['CFS Date/Time'], fields);
  const street = field(row, ['Street Name'], fields);
  const intersection = field(row, ['Nearest Intersection'], fields);
  const callType = field(row, ['Call Type'], fields);
  const disposition = field(row, ['Disposition'], fields);
  const id = callNumber || (Number.isInteger(row.id) ? String(row.id) : '');
  if (!id || !(callType || street || time)) return null;
  const coords = parseReportedCoordinates(street) || parseReportedCoordinates(intersection);
  const reportedAt = Number.isFinite(Date.parse(time)) ? Date.parse(time) : null;
  return { id, time, reportedAt, street, intersection, callType, disposition, coords,
    locationNote: coords ? 'Published coordinate; public call location may still be approximate' : 'No mapped call location' };
}

export function normalizeRapidCityResponse(data, fields = null) {
  if (!data || !Array.isArray(data.results)) throw new Error('Unexpected Baserow public-row response');
  const records = new Map();
  for (const row of data.results) {
    const item = normalizeRapidCityRow(row, fields);
    if (item) records.set(item.id, item);
  }
  return [...records.values()];
}

export function rapidCityPageUrl(fields, page) {
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGES) throw new Error('Invalid call-log page');
  const timeField = fields.get(canon('CFS Date/Time'));
  if (!timeField) throw new Error('Baserow reported-time field missing');
  const url = new URL(BASEROW_ROWS);
  url.searchParams.set('size', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('order_by', `-${timeField}`);
  return url.toString();
}

async function fetchJson(url, fetchImpl, externalSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  externalSignal?.addEventListener?.('abort', abort, { once: true });
  if (externalSignal?.aborted) abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener?.('abort', abort);
  }
}

/** Fetch the newest 1,000 public rows, retaining page order and de-duplicating call IDs. */
export async function fetchRapidCitySnapshot(fetchImpl = fetch, { signal = null } = {}) {
  const fields = publicFieldMap(await fetchJson(BASEROW_API, fetchImpl, signal));
  const records = new Map();
  let sourceTotal = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await fetchJson(rapidCityPageUrl(fields, page), fetchImpl, signal);
    if (!Array.isArray(payload?.results) || !Number.isInteger(payload.count) || payload.count < 0) {
      throw new Error('Unexpected Baserow public-row response');
    }
    if (sourceTotal === null) sourceTotal = payload.count;
    for (const item of normalizeRapidCityResponse(payload, fields)) records.set(item.id, item);
    if (!payload.next || payload.results.length === 0) break;
  }
  if (sourceTotal > 0 && !records.size) throw new Error('No recognizable call records; source schema may have changed');
  return { records: [...records.values()].sort((a, b) => (b.reportedAt || 0) - (a.reportedAt || 0)),
    sourceTotal: sourceTotal ?? 0 };
}

/** A user-requested, billable Google lookup. Accept only a local intersection result. */
export async function geocodePublicIntersection(intersectionText, apiKey, fetchImpl = fetch) {
  const intersection = nearestIntersection(intersectionText);
  if (!intersection) throw new Error('No defensible nearest intersection to locate');
  if (!apiKey) throw new Error('Google Maps key is required for approximate lookup');
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', `${intersection}, Rapid City, SD`);
  url.searchParams.set('key', apiKey);
  const payload = await fetchJson(url.toString(), fetchImpl, null);
  const generic = new Set(['n','s','e','w','north','south','east','west','st','street','ave',
    'avenue','rd','road','dr','drive','blvd','boulevard','ct','court','pl','place','ln','lane','hwy','highway']);
  const streetCores = intersection.split(' & ').map((street) =>
    (street.toLowerCase().match(/[a-z]+|\d+/g) || []).filter((word) => !generic.has(word)));
  const result = payload.status === 'OK'
    ? payload.results?.find((item) => {
      const addressWords = new Set(String(item.formatted_address || '').toLowerCase().match(/[a-z]+|\d+/g) || []);
      return item.types?.includes('intersection')
        && localCoordinates(Number(item.geometry?.location?.lat), Number(item.geometry?.location?.lng))
        && streetCores.every((words) => words.length && words.every((word) => addressWords.has(word)));
    })
    : null;
  if (!result) throw new Error('Intersection could not be located confidently in the Rapid City area');
  return { lat: Number(result.geometry.location.lat), lon: Number(result.geometry.location.lng),
    note: `Nearest intersection proxy (${intersection}); this is not the call site` };
}

export function createPublicCallLogLayer(config, { fetchImpl = fetch, geocodeImpl = geocodePublicIntersection } = {}) {
  let dataSource = null;
  let viewer = null;
  let records = [];
  let sourceTotal = 0;
  let lastUpdate = null;
  let lastError = config.rowsEndpoint ? null : 'No verified county feed; official page reported a cybersecurity outage on 2026-11-19';
  let locating = false;
  const locatedIntersections = new Map();
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const addMarker = (record) => {
    if (!dataSource || !record.coords) return;
    dataSource.entities.removeById(`${config.id}:${record.id}`);
    dataSource.entities.add({
      id: `${config.id}:${record.id}`,
      position: Cesium.Cartesian3.fromDegrees(record.coords.lon, record.coords.lat),
      point: { pixelSize: 9, color: Cesium.Color.fromCssColorString(config.color),
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
      name: `${record.callType || 'Call for service'} · ${record.id}`,
      properties: { agency: config.name, callNumber: record.id,
        reportedTime: record.time || 'Not provided', callType: record.callType || 'Not provided',
        street: record.street || 'Not provided', intersection: record.intersection || 'Not provided',
        disposition: record.disposition || 'Not provided', locationNote: record.locationNote,
        officialSource: config.pageUrl },
    });
  };
  return {
    id: config.id, name: config.name, icon: config.icon, source: config.source,
    updateInterval: config.updateInterval,
    init(targetViewer) {
      viewer = targetViewer;
      dataSource = new Cesium.CustomDataSource(config.id);
      dataSource.show = false;
      viewer.dataSources.add(dataSource);
    },
    enable() { if (dataSource) dataSource.show = true; },
    disable() { if (dataSource) dataSource.show = false; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getRecords() { return records.map((item) => ({ ...item })); },
    async update(_viewer, { signal = null } = {}) {
      if (!config.rowsEndpoint) {
        lastError = 'No verified county feed; official page reported a cybersecurity outage on 2026-11-19';
        notify();
        return true; // selectable layer, with an explicit unavailable source state
      }
      try {
        const next = await fetchRapidCitySnapshot(fetchImpl, { signal });
        if (signal?.aborted) return false;
        if (!dataSource) return false;
        dataSource.entities.removeAll();
        records = next.records;
        for (const record of records) {
          const prior = locatedIntersections.get(record.id);
          if (prior?.intersection === record.intersection) {
            record.coords = { ...prior.coords };
            record.locationNote = prior.note;
          }
        }
        sourceTotal = next.sourceTotal;
        for (const record of records) addMarker(record);
        lastUpdate = Date.now(); // retrieval time, never an incident timestamp
        lastError = null;
        notify();
        return true;
      } catch (error) {
        if (signal?.aborted) return false;
        lastError = error?.name === 'AbortError' ? 'Source request timed out' : String(error?.message || error);
        notify();
        return false;
      }
    },
    async locateApprox(id, apiKey) {
      const record = records.find((item) => item.id === id);
      if (!record) throw new Error('Call is no longer in the loaded window');
      if (record.coords) return record.coords;
      if (locating) throw new Error('Another location lookup is in progress');
      locating = true;
      try {
        const result = await geocodeImpl(record.intersection, apiKey, fetchImpl);
        record.coords = { lat: result.lat, lon: result.lon };
        record.locationNote = result.note;
        locatedIntersections.set(record.id, { intersection: record.intersection, coords: { ...record.coords }, note: result.note });
        addMarker(record);
        viewer?.camera?.flyTo?.({ destination: Cesium.Cartesian3.fromDegrees(result.lon, result.lat, 2500) });
        notify();
        return record.coords;
      } finally { locating = false; }
    },
    getStats() {
      const plotted = records.filter((item) => item.coords).length;
      return { count: records.length, mappedCount: plotted, totalRecords: records.length, sourceTotal,
        lastUpdate, error: lastError, unavailable: Boolean(lastError && !lastUpdate),
        stale: Boolean(lastError && lastUpdate), sourcePage: config.pageUrl,
        locationCoverage: `${plotted}/${records.length} loaded calls with mapped coordinates` };
    },
    destroy(targetViewer) {
      if (dataSource) targetViewer.dataSources.remove(dataSource, true);
      dataSource = null; viewer = null; records = []; sourceTotal = 0; locatedIntersections.clear();
      lastUpdate = null; lastError = config.rowsEndpoint ? null : 'No verified county feed; official page reported a cybersecurity outage on 2026-11-19';
      notify();
    },
  };
}

export const rapidCityPoliceCallsLayer = createPublicCallLogLayer(CALL_LOG_SOURCES.rapidCity);
export const penningtonCountyCallsLayer = createPublicCallLogLayer(CALL_LOG_SOURCES.pennington);
