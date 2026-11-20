// Research queue: verify outbound links independently from filming location.
// Preserve candidate locations without inventing GPS coordinates.
export const BLACK_HILLS_DRONE_VIDEOS = Object.freeze([
  Object.freeze({
    id: 'signal-rock',
    place: 'Signal Rock',
    corridor: 'Candidate area (unverified): Elk Creek / Piedmont',
    youtubeId: 'NdKwv8Nmaw0',
    title: 'Signal Rock',
    uploader: 'Black Hills Industrial History',
    verification: 'link-and-uploader-verified',
    notes: 'YouTube oEmbed confirms title and uploader; filming site, flight path, date and reuse rights remain unverified.',
  }),
  Object.freeze({
    id: 'elk-creek-canyon',
    place: 'Elk Creek Canyon',
    corridor: 'Candidate area (unverified): Piedmont / northern Black Hills',
    youtubeId: null,
    verification: 'needs-source',
    notes: 'Video title and location are provisional; find original upload.',
  }),
  Object.freeze({
    id: 'calcite',
    place: 'Calcite',
    corridor: 'Candidate area (unverified): Black Hills & Fort Pierre historic network',
    youtubeId: null,
    verification: 'needs-source',
    notes: 'Candidate remembered from prior discussion; confirm location and upload.',
  }),
  Object.freeze({
    id: 'stagebarn',
    place: 'Stagebarn',
    corridor: 'Candidate area (unverified): Northern Black Hills',
    youtubeId: null,
    verification: 'needs-source',
    notes: 'Candidate remembered from prior discussion; confirm location and upload.',
  }),
]);

/** Allow only canonical 11-character YouTube IDs, never arbitrary remote URLs. */
export function youtubeWatchUrl(videoId) {
  return typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? `https://www.youtube.com/watch?v=${videoId}`
    : null;
}

export function catalogEntryForLocation(id, entries = BLACK_HILLS_DRONE_VIDEOS) {
  return entries.find((entry) => entry.id === id) || null;
}
