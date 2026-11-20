/**
 * Published USGS 3DEP point-cloud work units intersecting a broad research box.
 * The study box is a search aid, not a Black Hills boundary or coverage claim.
 */
export const BLACK_HILLS_STUDY_EXTENT = Object.freeze([-105.0, 43.35, -102.65, 45.05]);
export const LIDAR_SOURCES = Object.freeze({
  explorer: 'https://apps.nationalmap.gov/lidar-explorer/',
  spatialMetadata: 'https://www.usgs.gov/3d-elevation-program/3dep-spatial-metadata',
  index: 'https://index.nationalmap.gov/arcgis/rest/services/3DEPElevationIndex/MapServer/24',
});
const MAX_WORK_UNITS = 100;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_TOTAL_VERTICES = 50_000;
const REQUEST_TIMEOUT_MS = 15_000;
const PAGE_SIZE = 50;
const FIELDS = 'OBJECTID,workunit,project,collect_start,collect_end,ql,lpc_pub_date,lpc_link,metadata_link';

function queryBase(extent) {
  if (!Array.isArray(extent) || extent.length !== 4 || !extent.every(Number.isFinite)) throw new Error('Invalid study extent');
  const [west, south, east, north] = extent;
  const [studyWest, studySouth, studyEast, studyNorth] = BLACK_HILLS_STUDY_EXTENT;
  if (!(west >= studyWest && east <= studyEast && south >= studySouth && north <= studyNorth && west < east && south < north)) throw new Error('Extent outside Black Hills study region');
  return {
    where: '1=1', geometry: extent.join(','), geometryType: 'esriGeometryEnvelope',
    inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outSR: '4326',
  };
}

async function query(params, fetchImpl, signal, timeoutMs) {
  const url = new URL(`${LIDAR_SOURCES.index}/query`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const controller = new AbortController();
  let rejectDeadline;
  const deadline = new Promise((_, reject) => { rejectDeadline = reject; });
  const onAbort = () => { controller.abort(); rejectDeadline(new DOMException('USGS 3DEP request canceled', 'AbortError')); };
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => {
    controller.abort();
    rejectDeadline(new Error('USGS 3DEP request timed out'));
  }, timeoutMs);
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetchImpl(url.toString(), { signal: controller.signal });
      if (!response.ok) throw new Error(`USGS 3DEP request failed (${response.status})`);
      const declaredBytes = Number(response.headers?.get?.('content-length'));
      if (declaredBytes > MAX_RESPONSE_BYTES) throw new Error('USGS 3DEP response too large');
      let body;
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        const chunks = [];
        let bytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('USGS 3DEP response too large'); }
          chunks.push(value);
        }
        const complete = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) { complete.set(chunk, offset); offset += chunk.byteLength; }
        body = JSON.parse(new TextDecoder().decode(complete));
      } else if (typeof response.text === 'function') {
        const raw = await response.text();
        if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) throw new Error('USGS 3DEP response too large');
        body = JSON.parse(raw);
      } else {
        body = await response.json();
        if (JSON.stringify(body).length > MAX_RESPONSE_BYTES) throw new Error('USGS 3DEP response too large');
      }
      if (body?.error || !body || typeof body !== 'object') throw new Error('USGS 3DEP returned an error');
      return body;
    })()]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function safeSourceLink(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'rockyweb.usgs.gov' || url.hostname === 'prd-tnm.s3.amazonaws.com') ? url.toString() : null;
  } catch { return null; }
}

function geometryVertices(geometry) {
  if (!['Polygon', 'MultiPolygon'].includes(geometry?.type)) return null;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons) || !polygons.length) return null;
  let count = 0;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) return null;
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) return null;
      for (const point of ring) {
        if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])
          || point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90) return null;
        if (++count > MAX_TOTAL_VERTICES) throw new Error('USGS 3DEP geometry exceeds safe display limit');
      }
    }
  }
  return count;
}

function normalizeFeature(feature) {
  const p = feature?.properties;
  const id = Number(p?.OBJECTID);
  if (!Number.isInteger(id) || id < 0 || !geometryVertices(feature?.geometry)) return null;
  const epoch = (value) => Number.isFinite(value) && value > 0 ? new Date(value).toISOString().slice(0, 10) : null;
  return {
    id,
    workunit: String(p.workunit || 'Unnamed work unit').slice(0, 255),
    project: String(p.project || 'Project not supplied').slice(0, 255),
    qualityLevel: String(p.ql || 'Not supplied').slice(0, 40),
    collectionStart: epoch(p.collect_start),
    collectionEnd: epoch(p.collect_end),
    published: epoch(p.lpc_pub_date),
    pointCloudUrl: safeSourceLink(p.lpc_link),
    metadataUrl: safeSourceLink(p.metadata_link),
    geometry: feature.geometry,
  };
}

/** Query bounded published work units. Empty means no matching published index rows, not missing LiDAR. */
export async function fetchLidarWorkUnits({ fetchImpl = fetch, signal, extent = BLACK_HILLS_STUDY_EXTENT, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  if (!(Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= REQUEST_TIMEOUT_MS)) throw new Error('Invalid USGS timeout');
  const base = queryBase(extent);
  const idsBody = await query({ ...base, f: 'json', returnIdsOnly: true }, fetchImpl, signal, timeoutMs);
  if (!Array.isArray(idsBody.objectIds)) throw new Error('USGS 3DEP work-unit IDs unavailable');
  const ids = [...new Set(idsBody.objectIds)].filter(Number.isInteger).sort((a, b) => a - b);
  if (ids.length > MAX_WORK_UNITS) throw new Error('USGS 3DEP result exceeds safe display limit');
  const units = [];
  let totalVertices = 0;
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    const body = await query({
      f: 'geojson', objectIds: chunk.join(','), outFields: FIELDS,
      returnGeometry: true, outSR: 4326, geometryPrecision: 4,
      maxAllowableOffset: 0.0005,
    }, fetchImpl, signal, timeoutMs);
    if (body.type !== 'FeatureCollection' || !Array.isArray(body.features)) throw new Error('USGS 3DEP geometry unavailable');
    for (const feature of body.features) {
      const unit = normalizeFeature(feature);
      if (unit) {
        totalVertices += geometryVertices(unit.geometry);
        if (totalVertices > MAX_TOTAL_VERTICES) throw new Error('USGS 3DEP geometry exceeds safe display limit');
        units.push(unit);
      }
    }
  }
  const actual = new Set(units.map((unit) => unit.id));
  if (actual.size !== ids.length) throw new Error('USGS 3DEP returned incomplete work-unit geometry');
  return units.sort((a, b) => a.workunit.localeCompare(b.workunit));
}

/** Only verified published work-unit footprints are rendered; never fill gaps by inference. */
export function workUnitsGeoJson(units) {
  return {
    type: 'FeatureCollection',
    features: units.map((unit) => ({ type: 'Feature', id: unit.id,
      properties: { workunit: unit.workunit, project: unit.project, qualityLevel: unit.qualityLevel },
      geometry: unit.geometry,
    })),
  };
}

/** Bounds of one authoritative footprint, for camera navigation only. */
export function workUnitBounds(unit) {
  const geometry = unit?.geometry;
  if (!['Polygon', 'MultiPolygon'].includes(geometry?.type)) return null;
  const points = [];
  const visit = (value) => {
    if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      if (Number.isFinite(value[0]) && Number.isFinite(value[1])) points.push(value);
    } else if (Array.isArray(value)) value.forEach(visit);
  };
  visit(geometry.coordinates);
  if (!points.length) return null;
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
