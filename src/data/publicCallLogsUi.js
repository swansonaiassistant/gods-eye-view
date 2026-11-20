import { CALL_LOG_SOURCES, nearestIntersection } from './publicCallLogs.js';

const SOURCES = [CALL_LOG_SOURCES.rapidCity, CALL_LOG_SOURCES.pennington];
const MOUNTAIN_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver', dateStyle: 'medium', timeStyle: 'short',
});
const text = (value) => String(value || '').trim() || 'Not provided';
const timeText = (value) => Number.isFinite(value) ? MOUNTAIN_TIME.format(new Date(value)) + ' MT' : 'Not provided';

/** Keep the list independent from Cesium pins: most published rows have no coordinates. */
export function initPublicCallLogPanel(manager, layers, documentRef = document) {
  const panel = documentRef.getElementById('public-call-log-panel');
  if (!panel) return () => {};
  const node = (id) => documentRef.getElementById(id);
  const sourceButton = [node('call-log-rapid'), node('call-log-county')];
  const modules = [layers.rapidCity, layers.pennington];
  let selected = 0;
  let busy = false;
  let actionMessage = '';
  const open = node('call-log-open');
  const search = node('call-log-search');
  const age = node('call-log-age');
  const list = node('call-log-list');
  const make = (tag, className, value) => {
    const element = documentRef.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = value;
    return element;
  };
  const show = (visible) => {
    panel.hidden = !visible;
    open?.setAttribute('aria-expanded', String(visible));
    if (visible) render();
  };
  const render = () => {
    if (panel.hidden) return;
    const source = SOURCES[selected];
    const module = modules[selected];
    const stats = module.getStats();
    const enabled = manager.isEnabled(source.id);
    sourceButton.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === selected));
      button.classList.toggle('active', index === selected);
    });
    const state = stats.unavailable ? 'UNAVAILABLE' : stats.stale ? 'STALE · last good snapshot retained'
      : enabled ? 'ON' : 'OFF';
    node('call-log-status').textContent = `${state} · ${stats.error || (enabled ? 'Source ready' : 'Enable this layer to load calls')}${actionMessage ? ` · ${actionMessage}` : ''}`;
    node('call-log-enable').textContent = enabled ? 'DISABLE LAYER' : 'ENABLE LAYER';
    node('call-log-enable').disabled = busy;
    node('call-log-refresh').disabled = busy || !source.rowsEndpoint;
    node('call-log-source').href = source.pageUrl;
    const all = module.getRecords();
    const query = search.value.trim().toLowerCase();
    const hours = age.value === 'all' ? null : Number(age.value);
    const cutoff = hours ? Date.now() - hours * 3600_000 : null;
    const filtered = all.filter((item) => {
      if (cutoff && (!item.reportedAt || item.reportedAt < cutoff)) return false;
      return !query || [item.id, item.callType, item.street, item.intersection, item.disposition]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    node('call-log-summary').textContent = source.rowsEndpoint
      ? `${filtered.length} matching · ${all.length} newest rows loaded of ${stats.sourceTotal} public rows · retrieved ${timeText(stats.lastUpdate)} · reported times shown per call`
      : 'Official county log unavailable. No county records are shown.';
    list.replaceChildren();
    if (!filtered.length) list.append(make('p', 'call-log-empty', source.rowsEndpoint
      ? (enabled ? 'No calls match these filters in the loaded window.' : 'Enable the layer to load calls.')
      : 'The county reports its call log unavailable. Check the official source for restoration.'));
    for (const item of filtered.slice(0, 80)) {
      const card = make('article', 'call-log-item');
      card.setAttribute('role', 'listitem');
      const title = make('strong', '', `${text(item.callType)} · ${item.id}`);
      const reported = make('div', 'call-log-time', `Reported ${timeText(item.reportedAt)}`);
      const location = make('div', '', `Public street: ${text(item.street)} · Nearest intersection: ${text(item.intersection)}`);
      const disposition = make('div', '', `Disposition: ${text(item.disposition)}`);
      const note = make('div', 'call-log-location-note', item.locationNote);
      card.append(title, reported, location, disposition, note);
      if (!item.coords && nearestIntersection(item.intersection) && enabled) {
        const locate = make('button', 'call-log-locate', 'LOCATE APPROX (GOOGLE)');
        locate.type = 'button';
        locate.dataset.callId = item.id;
        locate.title = 'User-requested Google lookup may use API quota. Pin is at the nearest intersection, not the call site.';
        card.append(locate);
      }
      list.append(card);
    }
    if (filtered.length > 80) list.append(make('p', 'call-log-more', `Showing first 80 of ${filtered.length} matching calls. Narrow the filters to see more.`));
  };
  open?.addEventListener('click', () => show(panel.hidden));
  node('call-log-close').addEventListener('click', () => show(false));
  sourceButton.forEach((button, index) => button.addEventListener('click', () => {
    selected = index; actionMessage = ''; render();
  }));
  search.addEventListener('input', render);
  age.addEventListener('change', render);
  node('call-log-enable').addEventListener('click', async () => {
    if (busy) return;
    busy = true; actionMessage = 'Changing layer'; render();
    try {
      const source = SOURCES[selected];
      await manager.setEnabled(source.id, !manager.isEnabled(source.id), { origin: 'user' });
      actionMessage = '';
    } catch (error) { actionMessage = String(error?.message || error); }
    finally { busy = false; render(); }
  });
  node('call-log-refresh').addEventListener('click', async () => {
    if (busy) return;
    busy = true; actionMessage = 'Refreshing'; render();
    try {
      const source = SOURCES[selected];
      const ok = manager.isEnabled(source.id)
        ? await manager.refreshLayer(source.id)
        : await manager.setEnabled(source.id, true, { origin: 'user' });
      actionMessage = ok ? 'Refresh complete' : 'Refresh failed; see source status';
    } catch (error) { actionMessage = String(error?.message || error); }
    finally { busy = false; render(); }
  });
  list.addEventListener('click', async (event) => {
    const button = event.target?.closest?.('.call-log-locate');
    if (!button || busy || selected !== 0) return;
    const key = globalThis.window?.__GOOGLE_MAPS_API_KEY__ || import.meta.env?.GOOGLE_MAPS_API_KEY;
    busy = true; actionMessage = 'Locating nearest intersection'; render();
    try {
      await layers.rapidCity.locateApprox(button.dataset.callId, key);
      actionMessage = 'Approximate intersection pin added; call site remains unknown';
    } catch (error) { actionMessage = String(error?.message || error); }
    finally { busy = false; render(); }
  });
  const unsubs = modules.map((module) => module.subscribe(render));
  unsubs.push(manager.subscribe((change) => {
    if (SOURCES.some((source) => source.id === change?.layerId)) render();
  }));
  return () => { unsubs.forEach((unsubscribe) => unsubscribe()); show(false); };
}
