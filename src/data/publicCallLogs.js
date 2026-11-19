import * as Cesium from 'cesium';

/**
 * Public calls-for-service feeds. Calls are not confirmed crimes, not live
 * dispatch, and public locations are approximate. Never geocode to an invented
 * address or treat a street name as a coordinate.
 */
export const CALL_LOG_SOURCES = Object.freeze({
  rapidCity: Object.freeze({
    id: 'rapid-city-police-calls',
    name: 'Rapid City Police Calls',
    icon: '🚓',
    source: 'Rapid City Police · public call log',
    updateInterval: 4 * 60 * 60 * 1000,
    pageUrl: 'https://baserow.io/public/grid/d9YEH8ejNFzMkpXo8SYjydyLrgx8kLD1u0Bh2C1O5iU',
    endpoint: 'https://api.baserow.io/api/database/views/grid/d9YEH8ejNFzMkpXo8SYjydyLrgx8kLD1u0Bh2C1O5iU/public/rows/?size=200&user_field_names=true',
    color: '#39c6ff',
  }),
  pennington: Object.freeze({
    id: 'pennington-county-sheriff-calls',
    name: 'Pennington Sheriff Calls',
    icon: '🚨',
    source: 'Pennington County Sheriff · public call log',
    updateInterval: 5 * 60 * 1000,
    pageUrl: 'https://www.pennco.org/law_public_safety/sheriffs_office/about/call_for_service_log.php',
    // The county publishes an HTML/iframe log, not an authenticated JSON API.
    // Do not scrape an inaccessible iframe or simulate county incidents.
    endpoint: null,
    color: '#ffc06e',
  }),
});

function field(row, names) {
  const fields = Object.entries(row || {});
  for (const name of names) {
    const matched = fields.find(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === name.replace(/[^a-z0-9]/g, ''));
    if (matched && matched[1] !== undefined && matched[1] !== null) return String(matched[1]).trim();
  }
  return '';
}

export function parseReportedCoordinates(value) {
  if (typeof value !== 'string') return null;
  // Only accept a complete pair of explicitly published decimal coordinates.
  const match = value.trim().match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  // Reject points outside the Rapid City / Pennington County area.
  if (lat < 43.5 || lat > 44.6 || lon < -104.5 || lon > -102.4) return null;
  return { lat, lon };
}

export function normalizeRapidCityRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const callNumber = field(row, ['CFS #', 'CFS Number', 'CFS No', 'Call Number']);
  const time = field(row, ['CFS Date/Time', 'Date Time', 'Date/Time']);
  const street = field(row, ['Street Name', 'Street']);
  const intersection = field(row, ['Nearest Intersection', 'Intersection']);
  const callType = field(row, ['Call Type', 'Type']);
  const disposition = field(row, ['Disposition']);
  const id = callNumber || (Number.isInteger(row.id) ? String(row.id) : '');
  if (!id || !(callType || street || time)) return null;
  // Do not interpret text containing a nearest-intersection distance as exact.
  const coords = parseReportedCoordinates(street) || parseReportedCoordinates(intersection);
  return { id, time, street, intersection, callType, disposition, coords };
}

export function normalizeRapidCityResponse(data) {
  if (!data || !Array.isArray(data.results)) throw new Error('Unexpected Baserow public-row response');
  const records = new Map();
  for (const row of data.results) {
    const normalized = normalizeRapidCityRow(row);
    if (normalized) records.set(normalized.id, normalized);
  }
  return [...records.values()];
}

async function fetchWithTimeout(url, fetchImpl, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Source HTTP ' + response.status);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export function createPublicCallLogLayer(config, { fetchImpl = fetch } = {}) {
  let dataSource = null;
  let count = 0;
  let plottedCount = 0;
  let lastUpdate = null;
  let lastError = null;
  let unavailable = false;

  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    source: config.source,
    updateInterval: config.updateInterval,
    init(viewer) {
      dataSource = new Cesium.CustomDataSource(config.id);
      dataSource.show = false;
      viewer.dataSources.add(dataSource);
    },
    enable() { if (dataSource) dataSource.show = true; },
    disable() { if (dataSource) dataSource.show = false; },
    async update() {
      if (!config.endpoint) {
        unavailable = true;
        lastError = 'County source has no verified machine-readable public feed; check official log';
        return false;
      }
      try {
        const response = await fetchWithTimeout(config.endpoint, fetchImpl);
        const records = normalizeRapidCityResponse(await response.json());
        // A source schema change must not silently wipe previously valid data.
        if (!records.length) throw new Error('No recognizable call records; source schema may have changed');
        if (!dataSource) return false;
        const next = [];
        for (const record of records) {
          if (!record.coords) continue;
          next.push({
            id: config.id + ':' + record.id,
            position: Cesium.Cartesian3.fromDegrees(record.coords.lon, record.coords.lat),
            point: {
              pixelSize: 8,
              color: Cesium.Color.fromCssColorString(config.color),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            name: (record.callType || 'Call for service') + ' · ' + record.id,
            properties: {
              agency: config.name,
              callNumber: record.id,
              reportedTime: record.time || 'Not provided',
              callType: record.callType || 'Not provided',
              street: record.street || 'Not provided',
              intersection: record.intersection || 'Not provided',
              disposition: record.disposition || 'Not provided',
              locationNote: 'Approximate public call location; not an active dispatch location',
              officialSource: config.pageUrl,
            },
          });
        }
        dataSource.entities.removeAll();
        for (const entity of next) dataSource.entities.add(entity);
        count = records.length;
        plottedCount = next.length;
        lastUpdate = Date.now(); // successful retrieval, NOT incident time
        lastError = null;
        unavailable = false;
        return true;
      } catch (error) {
        lastError = error?.name === 'AbortError' ? 'Source request timed out' : String(error?.message || error);
        unavailable = lastUpdate === null;
        return false;
      }
    },
    getStats() {
      return {
        count: plottedCount,
        totalRecords: count,
        lastUpdate,
        error: lastError,
        unavailable,
        stale: Boolean(lastError && lastUpdate),
        sourcePage: config.pageUrl,
        locationCoverage: plottedCount + '/' + count + ' calls with explicit published coordinates',
      };
    },
    destroy(viewer) {
      if (dataSource) viewer.dataSources.remove(dataSource, true);
      dataSource = null;
      count = 0;
      plottedCount = 0;
      lastUpdate = null;
      lastError = null;
      unavailable = false;
    },
  };
}

export const rapidCityPoliceCallsLayer = createPublicCallLogLayer(CALL_LOG_SOURCES.rapidCity);
export const penningtonCountyCallsLayer = createPublicCallLogLayer(CALL_LOG_SOURCES.pennington);
