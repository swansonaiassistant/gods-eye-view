export const HISTORICAL_TOPO_SOURCE = Object.freeze({
  catalog: 'https://tnmaccess.nationalmap.gov/api/v1/products',
  viewer: 'https://ngmdb.usgs.gov/topoview/',
  dataset: 'Historical Topographic Maps',
  yearRange: [1884, 2006],
});
/** Build a bounded, paged USGS TNM product discovery URL. */
export function historicalTopoSearch(bbox, { max = 100, offset = 0 } = {}) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) throw new Error('Invalid bbox');
  if (!Number.isInteger(max) || max < 1 || max > 500) throw new Error('Invalid page size');
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) throw new Error('Invalid page offset');
  const [west,south,east,north] = bbox;
  if (!(west < east && south < north) || west < -106 || east > -101 || south < 42 || north > 46) throw new Error('Invalid Black Hills AOI');
  const url = new URL(HISTORICAL_TOPO_SOURCE.catalog);
  url.searchParams.set('datasets', HISTORICAL_TOPO_SOURCE.dataset);
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set('max', String(max));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}
export function normalizeHistoricalMap(raw) {
  if (!raw || typeof raw !== 'object' || !raw.downloadURL) return null;
  let downloadURL;
  try {
    downloadURL = new URL(String(raw.downloadURL));
    if (downloadURL.protocol !== 'https:' || downloadURL.hostname !== 'prd-tnm.s3.amazonaws.com'
      || !downloadURL.pathname.startsWith('/StagedProducts/Maps/HistoricalTopo/')
      || downloadURL.username || downloadURL.password || downloadURL.search || downloadURL.hash) return null;
  } catch { return null; }
  // dateCreated is the catalog record date, not the year the map depicts.
  const publicationYear = String(raw.publicationDate ?? '').match(/^(\d{4})(?:-|$)/)?.[1];
  const yearCandidate = Number(publicationYear);
  const year = publicationYear && yearCandidate >= HISTORICAL_TOPO_SOURCE.yearRange[0]
    && yearCandidate <= HISTORICAL_TOPO_SOURCE.yearRange[1] ? yearCandidate : null;
  return { title: String(raw.title ?? 'USGS historical topographic map'), year,
    downloadURL: String(raw.downloadURL), id: String(raw.sourceId ?? raw.id ?? raw.downloadURL), source: HISTORICAL_TOPO_SOURCE.viewer };
}
