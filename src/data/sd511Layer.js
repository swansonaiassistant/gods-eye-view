import * as Cesium from 'cesium';
import { SD511_SOURCE, parseSd511Xml } from './sd511Source.js';

const COLORS = Object.freeze({ closure: Cesium.Color.ORANGERED, conditions: Cesium.Color.CYAN,
  construction: Cesium.Color.YELLOW, event: Cesium.Color.MAGENTA, incident: Cesium.Color.ORANGERED,
  restrictions: Cesium.Color.ORANGE, vehicle_restrictions: Cesium.Color.ORANGE });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

/** Official report endpoints only. No road-path line or camera image is inferred. */
export function createSd511Layer({ fetchImpl = globalThis.fetch, parseXml = parseSd511Xml } = {}) {
  let dataSource = null;
  let viewer = null;
  let enabled = false;
  let generation = 0;
  let reports = [];
  let retrievedAt = null;
  let feedRetrievedAt = null;
  let error = null;
  let proxyStale = false;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  return {
    id: SD511_SOURCE.id,
    name: 'South Dakota 511 Reports', icon: '▤', source: 'SDDOT 511 · public XML',
    updateInterval: SD511_SOURCE.refreshMs,
    init(nextViewer) {
      viewer = nextViewer;
      dataSource = new Cesium.CustomDataSource('sd511-official-report-endpoints');
      dataSource.show = false;
      viewer.dataSources.add(dataSource);
    },
    enable() { enabled = true; if (dataSource) dataSource.show = true; notify(); },
    disable() { enabled = false; generation++; if (dataSource) dataSource.show = false; notify(); },
    async update() {
      const requestGeneration = ++generation;
      try {
        const response = await fetchImpl(SD511_SOURCE.apiPath, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        const nextReports = parseXml(xml);
        if (!enabled || requestGeneration !== generation || !dataSource) return false;
        const nextFeedRetrieved = Date.parse(response.headers?.get('X-GEV-Source-Retrieved') || '');
        const nextProxyStale = response.headers?.get('X-GEV-Source-Stale') === 'true';
        const entities = dataSource.entities;
        entities.removeAll();
        for (const report of nextReports) {
          const color = COLORS[report.categories[0]] || Cesium.Color.WHITE;
          for (const [kind, point] of [['start', report.start], ['end', report.end]]) {
            if (!point) continue;
            entities.add({
              id: `sd511:${report.id}:${kind}`, name: `${report.route} ${kind} endpoint`,
              position: Cesium.Cartesian3.fromDegrees(...point),
              point: { pixelSize: 8, color, outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
              properties: { reportId: report.id, endpoint: kind, updatedAt: report.updatedAt,
                sourceUrl: report.source, locationNote: report.locationNote },
              description: `${escapeHtml(report.route)} · ${escapeHtml(report.categories.join(', '))}. ` +
                `${escapeHtml(report.description)}. Official ${kind} endpoint; no road-path geometry supplied. ` +
                `<a href="${SD511_SOURCE.homepage}" target="_blank" rel="noopener noreferrer">SD511 source</a>`,
            });
          }
        }
        reports = nextReports;
        retrievedAt = Date.now();
        feedRetrievedAt = Number.isFinite(nextFeedRetrieved) ? nextFeedRetrieved : retrievedAt;
        proxyStale = nextProxyStale;
        error = nextProxyStale ? 'Public feed refresh failed; showing cached reports' : null;
        viewer?.scene?.requestRender?.();
        notify();
        return true;
      } catch (cause) {
        if (requestGeneration !== generation) return false;
        error = cause instanceof Error ? cause.message : 'SD511 source unavailable';
        notify();
        return true;
      }
    },
    destroy(nextViewer) {
      enabled = false; generation++;
      if (dataSource) nextViewer.dataSources.remove(dataSource, true);
      dataSource = null; viewer = null; reports = []; retrievedAt = null;
      feedRetrievedAt = null; error = null; proxyStale = false; notify(); listeners.clear();
    },
    getReports() { return [...reports]; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getStats() {
      const lastReported = reports.reduce((latest, report) => Math.max(latest, report.updatedAt || 0), 0);
      const status = error && !retrievedAt ? 'unavailable' : error || proxyStale ? 'stale'
        : reports.length ? 'nominal' : retrievedAt ? 'empty' : 'idle';
      return { count: reports.length, lastUpdate: retrievedAt, error, status,
        stale: status === 'stale', source: 'SDDOT 511 · official public XML',
        coverage: 'South Dakota route endpoint reports · no road-path geometry or cameras',
        loadingLabel: retrievedAt
          ? `${reports.length} active route location${reports.length === 1 ? '' : 's'} · ` +
            `source updated ${lastReported ? new Date(lastReported).toLocaleString() : 'unknown'} · ` +
            `feed retrieved ${feedRetrievedAt ? new Date(feedRetrievedAt).toLocaleString() : 'unknown'} · ` +
            'official endpoints only, not road alignment'
          : 'Enable to query the public SD511 XML feed',
      };
    },
  };
}

export default createSd511Layer();
