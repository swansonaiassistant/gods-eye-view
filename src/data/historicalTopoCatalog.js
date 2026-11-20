export const HISTORICAL_TOPO_SOURCE = Object.freeze({
  catalog: 'https://tnmaccess.nationalmap.gov/api/v1/products',
  viewer: 'https://ngmdb.usgs.gov/topoview/',
  dataset: 'Historical Topographic Maps',
  yearRange: [1884, 2006],
});
/** Build a USGS TNM product discovery URL; discovered maps need georeferencing before rendering. */
export function historicalTopoSearch(bbox, { max = 100 } = {}) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) throw new Error('Invalid bbox');
  const [west,south,east,north] = bbox;
  if (!(west < east && south < north) || west < -106 || east > -101 || south < 42 || north > 46) throw new Error('Invalid Black Hills AOI');
  const url = new URL(HISTORICAL_TOPO_SOURCE.catalog);
  url.searchParams.set('datasets', HISTORICAL_TOPO_SOURCE.dataset);
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set('max', String(Math.min(500,Math.max(1,Math.trunc(max)))));
  return url.toString();
}
export function normalizeHistoricalMap(raw) {
  if (!raw || typeof raw !== 'object' || !raw.downloadURL) return null;
  const year = Number(String(raw.dateCreated ?? raw.publicationDate ?? '').slice(0,4));
  return { title: String(raw.title ?? 'USGS historical topographic map'), year: Number.isInteger(year) ? year : null,
    downloadURL: String(raw.downloadURL), id: String(raw.sourceId ?? raw.id ?? raw.downloadURL), source: HISTORICAL_TOPO_SOURCE.viewer };
}
