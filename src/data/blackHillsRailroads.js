import * as Cesium from 'cesium';
import { governorRequestRender } from '../renderGovernor.js';
import { overpassWaysToRailGeoJSON, BLACK_HILLS_BBOX } from './blackHillsRailroadsData.js';

// Only historical OSM railway geometries are displayed. These are NOT a
// transcription of any third-party custom map or an authoritative survey.
// Reuse the app's bounded, cached, same-origin proxy. It handles upstream
// mirror failover and avoids direct browser CORS/preflight failures.
const ENDPOINTS = ['/api/overpass'];
const QUERY = `[out:json][timeout:35];way["railway"~"^(abandoned|disused|razed)$"](${BLACK_HILLS_BBOX});out geom;`;
const state = { viewer: null, source: null, enabled: false, controller: null,
  count: 0, lastUpdate: null, error: null, loading: false, generation: 0 };

async function loadRailways() {
  const generation = ++state.generation;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  state.loading = true;
  state.error = null;
  let lastError = null;
  try {
    for (const endpoint of ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: new URLSearchParams({ data: QUERY }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(100000)]),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        if (controller.signal.aborted || generation !== state.generation || !state.enabled) return;
        const geojson = overpassWaysToRailGeoJSON(raw);
        const source = await Cesium.GeoJsonDataSource.load(geojson, {
          clampToGround: true,
          stroke: Cesium.Color.fromCssColorString('#f6ab47'),
          strokeWidth: 3,
        });
        if (controller.signal.aborted || generation !== state.generation || !state.enabled) return;
        source.name = 'Black Hills Historic Railroads (OSM)';
        for (const entity of source.entities.values) {
          if (entity.polyline) {
            entity.polyline.clampToGround = true;
            entity.polyline.width = 3;
            entity.polyline.material = Cesium.Color.fromCssColorString('#f6ab47');
          }
        }
        await state.viewer.dataSources.add(source);
        if (controller.signal.aborted || generation !== state.generation || !state.enabled) {
          state.viewer.dataSources.remove(source, true);
          return;
        }
        if (state.source) state.viewer.dataSources.remove(state.source, true);
        state.source = source;
        state.count = geojson.features.length;
        state.lastUpdate = Date.now();
        state.error = null;
        governorRequestRender('black-hills-railways-ready');
        return;
      } catch (error) {
        if (controller.signal.aborted || generation !== state.generation || !state.enabled) return;
        lastError = error;
      }
    }
    state.error = `Historic railway source unavailable: ${lastError?.message || 'unknown error'}`;
  } finally {
    if (generation === state.generation) {
      state.loading = false;
      if (state.controller === controller) state.controller = null;
      governorRequestRender('black-hills-railways-status');
    }
  }
}

export default {
  id: 'black-hills-railroads',
  name: 'Black Hills Historic Railroads',
  icon: '╍',
  source: '© OpenStreetMap contributors · historical railway tags',
  updateInterval: 0,
  statsRefreshInterval: 1000,
  init(viewer) { state.viewer = viewer; },
  enable() {
    state.enabled = true;
    if (state.source) {
      state.source.show = true;
      governorRequestRender('black-hills-railways-on');
      return;
    }
    return loadRailways();
  },
  disable() {
    state.enabled = false;
    ++state.generation;
    state.controller?.abort();
    state.controller = null;
    state.loading = false;
    if (state.source) state.source.show = false;
    governorRequestRender('black-hills-railways-off');
  },
  update() { /* Static historic lines: explicit re-enable reloads after failure. */ },
  getStats() {
    return { count: state.count, lastUpdate: state.lastUpdate,
      loading: state.loading, error: state.error,
      status: state.loading ? 'loading' : state.error ? 'unavailable' : 'ready' };
  },
  destroy() {
    this.disable();
    if (state.source && state.viewer) state.viewer.dataSources.remove(state.source, true);
    state.source = null;
    state.viewer = null;
    state.count = 0;
    state.lastUpdate = null;
    state.error = null;
  },
};
