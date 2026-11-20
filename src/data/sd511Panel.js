import * as Cesium from 'cesium';
import { SD511_SOURCE } from './sd511Source.js';

const BLACK_HILLS_BBOX = [-104.2, 43.3, -102.6, 45.1];
const dateText = (value) => value ? new Date(value).toLocaleString() : 'not supplied';
const inBlackHills = (report) => [report.start, report.end].some((point) => point
  && point[0] >= BLACK_HILLS_BBOX[0] && point[0] <= BLACK_HILLS_BBOX[2]
  && point[1] >= BLACK_HILLS_BBOX[1] && point[1] <= BLACK_HILLS_BBOX[3]);

/** Accessible opt-in list for official SD511 reports, without inferred route geometry. */
export function initSd511Panel(viewer, dataManager, layer, doc = document) {
  if (doc.getElementById('gev-sd511-panel')) return () => {};
  const button = doc.createElement('button');
  button.type = 'button'; button.textContent = 'SD511 ROADS';
  button.setAttribute('aria-controls', 'gev-sd511-panel');
  button.setAttribute('aria-expanded', 'false');
  button.style.cssText = 'position:fixed;right:16px;bottom:160px;z-index:109;background:#14232c;color:#fff;border:1px solid #80bdda;border-radius:6px;padding:9px 12px;font:12px monospace;cursor:pointer';
  const panel = doc.createElement('aside');
  panel.id = 'gev-sd511-panel'; panel.hidden = true;
  panel.setAttribute('data-gev-research-panel', '');
  panel.setAttribute('aria-label', 'South Dakota 511 public road reports');
  panel.style.cssText = 'position:fixed;right:16px;bottom:204px;z-index:109;width:min(450px,calc(100vw - 32px));max-height:min(62vh,calc(100vh - 220px));overflow:auto;background:#10202bf2;color:#fff;border:1px solid #80bdda;border-radius:8px;padding:14px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 10px 35px #0009';
  const title = doc.createElement('h2'); title.textContent = 'South Dakota 511 road reports';
  title.style.cssText = 'font-size:16px;margin:0 0 6px';
  const note = doc.createElement('p');
  note.textContent = 'Official route start/end coordinates only. Pins do not trace the road or show the whole affected segment. Reports can lag changing conditions; verify travel decisions on SD511. Camera images and locations are not in this feed.';
  const toolbar = doc.createElement('div'); toolbar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  const toggle = doc.createElement('button'); toggle.type = 'button';
  const refresh = doc.createElement('button'); refresh.type = 'button'; refresh.textContent = 'REFRESH SD511';
  const region = doc.createElement('select'); region.setAttribute('aria-label', 'SD511 region');
  for (const [value, label] of [['black-hills', 'Black Hills'], ['statewide', 'Statewide']]) {
    const option = doc.createElement('option'); option.value = value; option.textContent = label; region.append(option);
  }
  const filter = doc.createElement('select'); filter.setAttribute('aria-label', 'SD511 report category');
  for (const [value, label] of [['all', 'All reports'], ['closure', 'Closures'],
    ['conditions', 'Conditions'], ['construction', 'Construction'], ['event', 'Events'], ['incident', 'Incidents'],
    ['restrictions', 'Restrictions']]) {
    const option = doc.createElement('option'); option.value = value; option.textContent = label; filter.append(option);
  }
  for (const control of [toggle, refresh, region, filter]) {
    control.style.cssText = 'background:#263d45;color:#fff;border:1px solid #80bdda;border-radius:4px;padding:7px;cursor:pointer';
    toolbar.append(control);
  }
  const status = doc.createElement('p'); status.setAttribute('role', 'status');
  const list = doc.createElement('div'); list.setAttribute('role', 'list');
  const source = doc.createElement('a'); source.href = SD511_SOURCE.homepage;
  source.textContent = 'Open official SD511 map and cameras'; source.target = '_blank';
  source.rel = 'noopener noreferrer'; source.style.color = '#b9e6f5';
  panel.append(title, note, toolbar, status, list, source);
  doc.body.append(button, panel);
  let busy = false;
  function render() {
    const enabled = dataManager.isEnabled(layer.id);
    toggle.textContent = enabled ? 'HIDE REPORT PINS' : 'SHOW REPORT PINS';
    refresh.disabled = busy || !enabled;
    const stats = layer.getStats();
    status.textContent = `${stats.status.toUpperCase()} · ${stats.loadingLabel}` +
      (stats.error ? ` · ${stats.error}` : '');
    list.replaceChildren();
    const reports = layer.getReports().filter((report) =>
      (region.value === 'statewide' || inBlackHills(report))
      && (filter.value === 'all' || report.categories.includes(filter.value)));
    const count = doc.createElement('p'); count.textContent = `${reports.length} matching report locations`; list.append(count);
    for (const report of reports.slice(0, 150)) {
      const row = doc.createElement('article'); row.setAttribute('role', 'listitem');
      row.style.cssText = 'border-top:1px solid #577080;padding:8px 0';
      const name = doc.createElement('strong');
      name.textContent = `${report.route} · ${report.categories.join(', ')}`;
      const details = doc.createElement('div');
      details.textContent = `${report.description || 'No description'}${report.restrictions ? ` · ${report.restrictions}` : ''} · direction ${report.direction || 'unspecified'} · reported ${dateText(report.reportedAt)} · updated ${dateText(report.updatedAt)}. ${report.locationNote}`;
      const zoom = doc.createElement('button'); zoom.type = 'button'; zoom.textContent = 'ZOOM TO ENDPOINTS';
      zoom.style.cssText = 'background:#263d45;color:#fff;border:1px solid #80bdda;border-radius:4px;padding:4px;cursor:pointer';
      zoom.addEventListener('click', () => {
        const points = [report.start, report.end].filter(Boolean);
        const west = Math.min(...points.map((p) => p[0])) - 0.015;
        const east = Math.max(...points.map((p) => p[0])) + 0.015;
        const south = Math.min(...points.map((p) => p[1])) - 0.015;
        const north = Math.max(...points.map((p) => p[1])) + 0.015;
        void viewer.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(west, south, east, north) });
      });
      row.append(name, details, zoom); list.append(row);
    }
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
    render();
  });
  toggle.addEventListener('click', async () => { busy = true; render();
    try { await dataManager.toggle(layer.id, { origin: 'user' }); } finally { busy = false; render(); }
  });
  refresh.addEventListener('click', async () => { busy = true; render();
    try { await dataManager.refreshLayer(layer.id); } finally { busy = false; render(); }
  });
  region.addEventListener('change', render); filter.addEventListener('change', render);
  const unsubscribe = layer.subscribe(render);
  render();
  return () => { unsubscribe(); button.remove(); panel.remove(); };
}
