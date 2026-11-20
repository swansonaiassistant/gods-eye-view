import * as Cesium from 'cesium';
import { fetchLidarWorkUnits, LIDAR_SOURCES, workUnitBounds, workUnitsGeoJson } from './blackHillsLidarCoverage.js';

const dateText = (value) => value || 'not supplied';

/** Opt-in viewer for published USGS LPC work-unit footprints and metadata. */
export function initBlackHillsLidarPanel(viewer, doc = document, { fetchUnits = fetchLidarWorkUnits } = {}) {
  if (doc.getElementById('gev-lidar-coverage')) return () => {};
  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = 'BLACK HILLS LiDAR';
  button.setAttribute('aria-controls', 'gev-lidar-coverage');
  button.setAttribute('aria-expanded', 'false');
  button.style.cssText = 'position:fixed;right:16px;bottom:114px;z-index:109;background:#14232c;color:#fff;border:1px solid #8fbf7b;border-radius:6px;padding:9px 12px;font:12px monospace;cursor:pointer';
  const panel = doc.createElement('aside');
  panel.id = 'gev-lidar-coverage';
  panel.hidden = true;
  panel.setAttribute('data-gev-research-panel', '');
  panel.setAttribute('aria-label', 'Black Hills USGS 3DEP published LiDAR work units');
  panel.style.cssText = 'position:fixed;right:16px;bottom:158px;z-index:109;width:min(430px,calc(100vw - 32px));max-height:62vh;overflow:auto;background:#10202bf2;color:#fff;border:1px solid #8fbf7b;border-radius:8px;padding:14px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 10px 35px #0009';
  const title = doc.createElement('h2');
  title.textContent = 'USGS 3DEP point-cloud work units';
  title.style.cssText = 'font-size:16px;margin:0 0 6px';
  const note = doc.createElement('p');
  note.textContent = 'Published USGS work-unit footprints intersecting a broad SD/WY study box. This is not an official Black Hills boundary, area coverage percentage, gap map, or point-cloud viewer. Overlapping work units may cover the same ground.';
  const toolbar = doc.createElement('div');
  toolbar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  const toggle = doc.createElement('button'); toggle.type = 'button'; toggle.textContent = 'SHOW FOOTPRINTS';
  const refresh = doc.createElement('button'); refresh.type = 'button'; refresh.textContent = 'REFRESH USGS';
  for (const control of [toggle, refresh]) control.style.cssText = 'background:#263d35;color:#fff;border:1px solid #8fbf7b;border-radius:4px;padding:7px;cursor:pointer';
  toolbar.append(toggle, refresh);
  const status = doc.createElement('p'); status.setAttribute('role', 'status'); status.textContent = 'Not loaded. Select SHOW FOOTPRINTS to query USGS.';
  const list = doc.createElement('div'); list.setAttribute('role', 'list');
  const source = doc.createElement('a'); source.href = LIDAR_SOURCES.explorer; source.textContent = 'USGS 3DEP LidarExplorer'; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.style.color = '#b9e6a4';
  const metadata = doc.createElement('a'); metadata.href = LIDAR_SOURCES.spatialMetadata; metadata.textContent = 'USGS spatial metadata'; metadata.target = '_blank'; metadata.rel = 'noopener noreferrer'; metadata.style.cssText = 'color:#b9e6a4;margin-left:12px';
  panel.append(title, note, toolbar, status, list, source, metadata);
  doc.body.append(button, panel);
  let units = [];
  let dataSource = null;
  let enabled = false;
  let busy = false;
  let retrievedAt = null;
  let abort = null;
  let disposed = false;

  function render() {
    toggle.textContent = enabled ? 'HIDE FOOTPRINTS' : 'SHOW FOOTPRINTS';
    toggle.disabled = false;
    refresh.disabled = busy;
    if (dataSource) { dataSource.show = enabled; viewer.scene.requestRender(); }
    list.replaceChildren();
    for (const unit of units) {
      const row = doc.createElement('article'); row.setAttribute('role', 'listitem'); row.style.cssText = 'border-top:1px solid #607064;padding:8px 0';
      const name = doc.createElement('strong'); name.textContent = unit.workunit;
      const details = doc.createElement('div');
      details.textContent = `${unit.project} · ${unit.qualityLevel} · acquired ${dateText(unit.collectionStart)} to ${dateText(unit.collectionEnd)} · published ${dateText(unit.published)}`;
      const zoom = doc.createElement('button'); zoom.type = 'button'; zoom.textContent = 'ZOOM TO FOOTPRINT';
      zoom.style.cssText = 'background:#263d35;color:#fff;border:1px solid #8fbf7b;border-radius:4px;padding:4px;margin-right:8px;cursor:pointer';
      zoom.addEventListener('click', () => {
        const bounds = workUnitBounds(unit);
        if (bounds) void viewer.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(...bounds) });
      });
      row.append(name, details, zoom);
      for (const [label, url] of [['Source data', unit.pointCloudUrl], ['Project metadata', unit.metadataUrl]]) {
        if (!url) continue;
        const link = doc.createElement('a'); link.href = url; link.textContent = label;
        link.target = '_blank'; link.rel = 'noopener noreferrer'; link.style.cssText = 'color:#b9e6a4;margin-right:8px';
        row.append(link);
      }
      list.append(row);
    }
  }
  async function load() {
    if (busy) return;
    busy = true; abort = new AbortController(); status.textContent = 'Loading published USGS work units…'; render();
    try {
      const next = await fetchUnits({ signal: abort.signal });
      const replacement = await Cesium.GeoJsonDataSource.load(workUnitsGeoJson(next), {
        clampToGround: true,
        fill: Cesium.Color.LIME.withAlpha(0.16),
        stroke: Cesium.Color.LIME.withAlpha(0.8),
        strokeWidth: 2,
      });
      if (disposed || abort.signal.aborted) return;
      replacement.show = enabled;
      await viewer.dataSources.add(replacement);
      if (dataSource) viewer.dataSources.remove(dataSource, true);
      dataSource = replacement; units = next; retrievedAt = new Date();
      status.textContent = `${units.length} published USGS LPC work units · retrieved ${retrievedAt.toLocaleString()} · footprints may overlap. No point clouds downloaded.`;
    } catch (error) {
      if (error?.name !== 'AbortError') status.textContent = `${units.length ? 'STALE · previous work units retained' : 'UNAVAILABLE'} · ${String(error?.message || error)}${retrievedAt ? ` · retrieved ${retrievedAt.toLocaleString()}` : ''}`;
    } finally { busy = false; abort = null; if (!disposed) render(); }
  }
  button.addEventListener('click', () => {
    if (panel.hidden) {
      for (const other of doc.querySelectorAll('[data-gev-research-panel]')) {
        if (other === panel) continue;
        other.hidden = true;
        doc.querySelector(`[aria-controls="${other.id}"]`)?.setAttribute('aria-expanded', 'false');
      }
    }
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
  toggle.addEventListener('click', () => { enabled = !enabled; render(); if (enabled && !dataSource) void load(); });
  refresh.addEventListener('click', () => { if (enabled) void load(); });
  return () => { disposed = true; abort?.abort(); if (dataSource) viewer.dataSources.remove(dataSource, true); button.remove(); panel.remove(); };
}
