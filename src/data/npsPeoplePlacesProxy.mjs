import { NPS_PEOPLE_PLACES, npsQuery, normalizeNpsResponse } from './npsPeoplePlaces.js';

const CACHE_MS = 15 * 60_000;
const STALE_MS = 24 * 60 * 60_000;
const MAX_BODY_BYTES = 2_000_000;
const ERROR_COOLDOWN_MS = 60_000;

async function readBoundedJson(response) {
  if (Number(response.headers.get('content-length')) > MAX_BODY_BYTES) throw new Error('NPS response too large');
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new Error('NPS response too large');
    return JSON.parse(text);
  }
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) throw new Error('NPS response too large');
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

/** Same-origin read-only API proxy. Never sends a secret to the browser or logs upstream URLs. */
export function createNpsPeoplePlacesMiddleware({
  key = () => process.env.NPS_API_KEY,
  fetchImpl = fetch,
  now = Date.now,
} = {}) {
  const cache = new Map();
  const inFlight = new Map();
  const cooldown = new Map();
  return async (req, res) => {
    if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/status') return json(res, 200, { configured: Boolean(String(key() ?? '').trim()) });
    const kind = url.pathname.slice(1);
    const parkCode = url.searchParams.get('parkCode') || 'moru';
    if (!['people', 'places'].includes(kind) || !NPS_PEOPLE_PLACES.parkCodes.includes(parkCode)
        || [...url.searchParams.keys()].some((name) => name !== 'parkCode')) {
      return json(res, 400, { error: 'invalid_nps_request' });
    }
    const apiKey = String(key() ?? '').trim();
    if (!apiKey) return json(res, 503, { error: 'nps_key_required', source: NPS_PEOPLE_PLACES.getStarted });
    const cacheKey = `${kind}:${parkCode}`;
    const previous = cache.get(cacheKey);
    if (previous && now() - previous.retrievedAtMs < CACHE_MS) return json(res, 200, { ...previous.payload, state: 'cached' });
    if (now() < (cooldown.get(cacheKey) || 0)) {
      if (previous && now() - previous.retrievedAtMs < STALE_MS) return json(res, 200, { ...previous.payload, state: 'stale' });
      return json(res, 503, { error: 'nps_unavailable', source: NPS_PEOPLE_PLACES.docs });
    }
    let request = inFlight.get(cacheKey);
    if (!request) {
      request = (async () => {
        const response = await fetchImpl(npsQuery(kind, { parkCode }), {
          headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new Error('NPS unavailable');
        const normalized = normalizeNpsResponse(await readBoundedJson(response), kind);
        const payload = { state: 'ready', kind, parkCode, ...normalized, retrievedAt: new Date(now()).toISOString(), source: NPS_PEOPLE_PLACES.docs };
        cache.set(cacheKey, { payload, retrievedAtMs: now() });
        cooldown.delete(cacheKey);
        return payload;
      })().finally(() => inFlight.delete(cacheKey));
      inFlight.set(cacheKey, request);
    }
    try { return json(res, 200, await request); }
    catch {
      cooldown.set(cacheKey, now() + ERROR_COOLDOWN_MS);
      if (previous && now() - previous.retrievedAtMs < STALE_MS) return json(res, 200, { ...previous.payload, state: 'stale' });
      return json(res, 503, { error: 'nps_unavailable', source: NPS_PEOPLE_PLACES.docs });
    }
  };
}

export function npsPeoplePlacesProxy() {
  const middleware = createNpsPeoplePlacesMiddleware();
  return {
    name: 'nps-people-places-proxy',
    configureServer(server) { server.middlewares.use('/api/nps', middleware); },
    configurePreviewServer(server) { server.middlewares.use('/api/nps', middleware); },
  };
}
