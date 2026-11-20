import * as Cesium from 'cesium';
import { NPS_PEOPLE_PLACES } from './npsPeoplePlaces.js';

const PARK_LABELS = Object.freeze({ moru: 'Mount Rushmore', wica: 'Wind Cave', jeca: 'Jewel Cave', mimi: 'Minuteman Missile', badl: 'Badlands' });

/** Fetch only the app's same-origin server proxy; no API credential reaches the browser. */
export async function fetchNpsProfiles(kind, parkCode, { signal } = {}) {
  if (!['people', 'places'].includes(kind) || !NPS_PEOPLE_PLACES.parkCodes.includes(parkCode)) throw new Error('Invalid NPS selection');
  const response = await fetch(`/api/nps/${kind}?parkCode=${encodeURIComponent(parkCode)}`, { signal, credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error === 'nps_key_required' ? 'NPS API key required on this workstation' : 'NPS source unavailable');
  if (!Array.isArray(payload.records)) throw new Error('Invalid NPS response');
  return payload;
}

/** Optional source-cited research panel; People are never plotted as person locations. */
export function initNpsPeoplePlacesPanel(viewer, doc = document, { fetchProfiles = fetchNpsProfiles } = {}) {
  if (doc.getElementById('gev-nps-people-places')) return () => {};
  const button = doc.createElement('button');
  button.type = 'button'; button.textContent = 'NPS PEOPLE & PLACES';
  button.setAttribute('aria-controls', 'gev-nps-people-places'); button.setAttribute('aria-expanded', 'false');
  button.style.cssText = 'position:fixed;right:16px;bottom:158px;z-index:109;background:#14232c;color:#fff;border:1px solid #d9b76a;border-radius:6px;padding:9px 12px;font:12px monospace;cursor:pointer';
  const panel = doc.createElement('aside'); panel.id = 'gev-nps-people-places'; panel.hidden = true;
  panel.setAttribute('data-gev-research-panel', ''); panel.setAttribute('aria-label', 'National Park Service people and places');
  panel.style.cssText = 'position:fixed;right:16px;bottom:202px;z-index:109;width:min(430px,calc(100vw - 32px));max-height:50vh;overflow:auto;background:#10202bf2;color:#fff;border:1px solid #d9b76a;border-radius:8px;padding:14px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 10px 35px #0009';
  const heading = doc.createElement('h2'); heading.textContent = 'NPS People & Places'; heading.style.cssText = 'font-size:16px;margin:0 0 6px';
  const caveat = doc.createElement('p'); caveat.textContent = 'Official editorial profiles, not live tracking. Only NPS-supplied, public place points can appear on the globe; they do not establish site boundaries or current access. People are listed without map pins.';
  const controls = doc.createElement('div'); controls.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  const park = doc.createElement('select'); park.setAttribute('aria-label', 'NPS park');
  for (const [code, label] of Object.entries(PARK_LABELS)) { const option = doc.createElement('option'); option.value = code; option.textContent = label; park.append(option); }
  const kind = doc.createElement('select'); kind.setAttribute('aria-label', 'NPS content type');
  for (const [value, label] of [['places', 'Places'], ['people', 'People']]) { const option = doc.createElement('option'); option.value = value; option.textContent = label; kind.append(option); }
  const refresh = doc.createElement('button'); refresh.type = 'button'; refresh.textContent = 'LOAD / REFRESH';
  const source = doc.createElement('a'); source.href = NPS_PEOPLE_PLACES.docs; source.textContent = 'NPS source and API documentation'; source.target = '_blank'; source.rel = 'noopener noreferrer';
  const getKey = doc.createElement('a'); getKey.href = NPS_PEOPLE_PLACES.getStarted; getKey.textContent = 'Free NPS API key information'; getKey.target = '_blank'; getKey.rel = 'noopener noreferrer';
  for (const control of [park, kind, refresh]) control.style.cssText = 'background:#263d35;color:#fff;border:1px solid #d9b76a;border-radius:4px;padding:7px;cursor:pointer';
  for (const link of [source, getKey]) link.style.cssText = 'color:#f6d38a;margin-right:12px';
  controls.append(park, kind, refresh);
  const status = doc.createElement('p'); status.setAttribute('role', 'status'); status.textContent = 'Select a park and load official NPS profiles.';
  const list = doc.createElement('div'); list.setAttribute('role', 'list');
  panel.append(heading, caveat, controls, status, list, source, getKey);
  doc.body.append(button, panel);
  let active = null, records = [], retrievedAt = null, disposed = false;
  const pins = [];
  const clearPins = () => { for (const entity of pins.splice(0)) viewer.entities.remove(entity); viewer.scene.requestRender(); };
  function render() {
    clearPins(); list.replaceChildren();
    for (const record of records) {
      const row = doc.createElement('article'); row.setAttribute('role', 'listitem'); row.style.cssText = 'border-top:1px solid #607064;padding:8px 0';
      const name = doc.createElement('strong'); name.textContent = record.name;
      const summary = doc.createElement('p'); summary.textContent = record.summary || 'No summary supplied by NPS.'; summary.style.margin = '3px 0';
      const link = doc.createElement('a'); link.href = record.sourceUrl; link.textContent = 'NPS profile'; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.style.color = '#f6d38a';
      row.append(name, summary, link);
      if (kind.value === 'places' && Array.isArray(record.position)) {
        const note = doc.createElement('small'); note.textContent = record.locationConfidence || 'NPS supplied point; location uncertainty remains.';
        const zoom = doc.createElement('button'); zoom.type = 'button'; zoom.textContent = 'ZOOM TO NPS POINT';
        zoom.addEventListener('click', () => void viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(...record.position, 8_000) }));
        row.append(note, zoom);
        if (!panel.hidden) pins.push(viewer.entities.add({ name: record.name, position: Cesium.Cartesian3.fromDegrees(...record.position), point: { pixelSize: 9, color: Cesium.Color.GOLD, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 }, description: `<a href="${record.sourceUrl}" target="_blank" rel="noopener noreferrer">NPS source</a><p>NPS supplied point; site extent and current access are not established.</p>` }));
      }
      list.append(row);
    }
    viewer.scene.requestRender();
  }
  async function load() {
    active?.abort(); const request = new AbortController(); active = request;
    refresh.disabled = true; status.textContent = 'Loading official NPS profiles…';
    try {
      const payload = await fetchProfiles(kind.value, park.value, { signal: request.signal });
      if (disposed || active !== request) return;
      records = payload.records; retrievedAt = payload.retrievedAt;
      status.textContent = `${payload.state === 'stale' ? 'STALE · ' : ''}${records.length} NPS ${kind.value} for ${PARK_LABELS[park.value]} · retrieved ${retrievedAt ? new Date(retrievedAt).toLocaleString() : 'time unknown'}${payload.total > records.length ? ` · first ${records.length} of ${payload.total}` : ''}`;
      render();
    } catch (error) {
      if (request.signal.aborted || disposed) return;
      status.textContent = `${records.length ? 'STALE · previous profiles retained' : 'UNAVAILABLE'} · ${error.message}${retrievedAt ? ` · retrieved ${new Date(retrievedAt).toLocaleString()}` : ''}`;
    } finally { if (active === request) { active = null; refresh.disabled = false; } }
  }
  button.addEventListener('click', () => {
    if (panel.hidden) for (const other of doc.querySelectorAll('[data-gev-research-panel]')) {
      if (other === panel) continue; other.hidden = true;
      doc.querySelector(`[aria-controls="${other.id}"]`)?.setAttribute('aria-expanded', 'false');
    }
    panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden));
    if (panel.hidden) clearPins(); else if (records.length) render();
  });
  for (const select of [park, kind]) select.addEventListener('change', () => { active?.abort(); records = []; retrievedAt = null; render(); status.textContent = 'Select LOAD / REFRESH to query NPS.'; });
  refresh.addEventListener('click', () => void load());
  return () => { disposed = true; active?.abort(); clearPins(); button.remove(); panel.remove(); };
}
