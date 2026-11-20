/**
 * DISCOVERY extent only. This broad region spans the South Dakota / Wyoming
 * Black Hills and neighboring terrain; it is NOT an authoritative LiDAR footprint.
 */
export const BLACK_HILLS_STUDY_EXTENT = Object.freeze([-105.0, 43.35, -102.65, 45.05]);
export const LIDAR_SOURCES = Object.freeze({
  explorer: 'https://apps.nationalmap.gov/lidar-explorer/',
  nationalMap: 'https://apps.nationalmap.gov/downloader/',
  localCity: 'https://www.rcgov.org/departments/public-works/geographic-information-system/gis-data-216.html',
  projectIndex: '3DEP Elevation Index',
});
export function plannedCoverageCells(extent = BLACK_HILLS_STUDY_EXTENT, stepDegrees = 0.1) {
  if (!Array.isArray(extent) || extent.length !== 4 || !extent.every(Number.isFinite)) throw new Error('Invalid extent');
  if (!(stepDegrees >= 0.025 && stepDegrees <= 0.25)) throw new Error('Invalid grid step');
  const [west,south,east,north] = extent;
  if (!(west < east && south < north)) throw new Error('Invalid extent bounds');
  const cells = [];
  for (let lat = south; lat < north - 1e-7; lat += stepDegrees) {
    for (let lon = west; lon < east - 1e-7; lon += stepDegrees) {
      const bbox = [lon, lat, Math.min(east,lon+stepDegrees), Math.min(north,lat+stepDegrees)].map(n=>+n.toFixed(6));
      cells.push({ bbox, status:'unassessed', pointCloudAvailable:null, demAvailable:null, qualityLevel:null, projects:[] });
    }
  }
  return cells;
}
export function summarizeLidarCoverage(cells) {
  const total = cells.length;
  const lidar = cells.filter(cell => cell.pointCloudAvailable === true).length;
  const missing = cells.filter(cell => cell.pointCloudAvailable === false).length;
  const unknown = total - lidar - missing;
  return { total, lidar, missing, unknown, complete: total > 0 && unknown === 0 && missing === 0 };
}
