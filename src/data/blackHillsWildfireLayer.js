import * as Cesium from 'cesium';
import {
  BLACK_HILLS_FIRE_BBOX,
  WILDFIRE_INCIDENTS,
  wildfireIncidentsQuery,
  normalizeWildfireFeature,
} from './blackHillsWildfireIncidents.js';

const MAX_INCIDENTS = 500;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

/** A bounded, opt-in public incident layer. Points are not fire perimeters. */
export function createBlackHillsWildfireLayer({ fetchImpl = globalThis.fetch } = {}) {
  let dataSource = null;
  let enabled = false;
  let generation = 0;
  let count = 0;
  let lastReported = null;
  let incidentsSnapshot = [];
  let lastUpdate = null;
  let lastError = null;

  return {
    id: 'black-hills-wildfires',
    name: 'Black Hills Fire Incidents',
    icon: '△',
    source: WILDFIRE_INCIDENTS.publisher,
    updateInterval: WILDFIRE_INCIDENTS.refreshMs,

    init(viewer) {
      dataSource = new Cesium.CustomDataSource('black-hills-wildfires');
      dataSource.show = false;
      viewer.dataSources.add(dataSource);
      enabled = false;
      count = 0;
      lastReported = null;
      incidentsSnapshot = [];
      lastUpdate = null;
      lastError = null;
    },

    enable() {
      enabled = true;
      if (dataSource) dataSource.show = true;
    },

    disable() {
      enabled = false;
      generation++;
      if (dataSource) dataSource.show = false;
    },

    async update() {
      const requestGeneration = ++generation;
      try {
        const response = await fetchImpl(wildfireIncidentsQuery(BLACK_HILLS_FIRE_BBOX), {
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json();
        if (!Array.isArray(body?.features) || body.type !== 'FeatureCollection') {
          throw new Error('Invalid incident response');
        }
        // A page exactly at the cap may have been truncated even when the
        // GeoJSON response omits ArcGIS's exceededTransferLimit flag.
        if (body.features.length >= MAX_INCIDENTS || body.exceededTransferLimit === true) {
          throw new Error('Incident response exceeded safe limit');
        }
        if (!enabled || !dataSource || requestGeneration !== generation) return false;
        const incidents = [...new Map(body.features.map(normalizeWildfireFeature)
          .filter(Boolean).map((incident) => [incident.id, incident])).values()]
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const collection = dataSource.entities;
        collection.removeAll();
        for (const incident of incidents) {
          const color = incident.type === 'prescribed fire' ? Cesium.Color.YELLOW : Cesium.Color.ORANGERED;
          collection.add({
            id: `black-hills-fire:${incident.id}`,
            name: incident.incidentName,
            position: Cesium.Cartesian3.fromDegrees(...incident.position),
            point: { pixelSize: 10, color, outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
            // Cesium's stock info box is disabled in GEV. Keep only safe plain
            // metadata here for future detail UI, never raw provider fields.
            properties: { incidentType: incident.type, reportedAt: incident.reportedAt,
              updatedAt: incident.updatedAt, sourceUrl: incident.source },
            description: `${escapeHtml(incident.incidentName)} — ${escapeHtml(incident.type)}. ` +
              `${escapeHtml(WILDFIRE_INCIDENTS.advisory)}. ` +
              `<a href="${WILDFIRE_INCIDENTS.itemUrl}" target="_blank" rel="noopener noreferrer">NIFC source</a>`,
          });
        }
        count = incidents.length;
        incidentsSnapshot = incidents;
        lastReported = incidents.reduce((latest, incident) => Math.max(latest, incident.updatedAt || 0), 0) || null;
        lastUpdate = Date.now();
        lastError = null;
        return true;
      } catch (error) {
        if (requestGeneration !== generation) return false;
        lastError = error instanceof Error ? error.message : 'Incident source unavailable';
        // Source outages are a settled layer state, so keep the toggle ON and
        // expose UNAVAILABLE/STALE rather than rejecting manager activation.
        return true;
      }
    },

    destroy(viewer) {
      enabled = false;
      generation++;
      if (dataSource) viewer.dataSources.remove(dataSource, true);
      dataSource = null;
      count = 0;
      lastReported = null;
      incidentsSnapshot = [];
      lastUpdate = null;
      lastError = null;
    },

    getStats() {
      const preview = incidentsSnapshot.slice(0, 3)
        .map((incident) => `${incident.incidentName} (${incident.type})`).join(', ');
      return { count, lastUpdate, error: lastError,
        stale: Boolean(lastError && lastUpdate),
        status: lastError && !lastUpdate ? 'unavailable' : lastError ? 'stale' : count ? 'nominal' : 'empty',
        source: WILDFIRE_INCIDENTS.publisher,
        coverage: 'Black Hills study area · reported points, not fire fronts',
        loadingLabel: lastUpdate
          ? count ? `${count} reported point${count === 1 ? '' : 's'} · ${preview}${count > 3 ? '…' : ''} · source updated ${lastReported ? new Date(lastReported).toLocaleString() : 'time unknown'} · retrieved ${new Date(lastUpdate).toLocaleString()} · not fire fronts`
            : `No incidents currently reported in study area · retrieved ${new Date(lastUpdate).toLocaleString()}`
          : undefined,
      };
    },

    getRowControls() {
      const types = [
        ['wildfire', '#ff4500'],
        ['prescribed fire', '#ffff00'],
        ['incident complex', '#ff4500'],
        ['reported fire', '#ff4500'],
      ];
      return { legend: types.map(([label, color]) => ({
        label, color,
        count: incidentsSnapshot.filter((incident) => incident.type === label).length,
        blurb: 'Reported incident point, not a perimeter or evacuation advisory',
      })).filter((entry) => entry.count > 0) };
    },
  };
}

export default createBlackHillsWildfireLayer();
