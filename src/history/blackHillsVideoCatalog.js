// Research queue, not a claim that any source has been independently verified.
// Preserve candidate locations without inventing GPS coordinates or channel names.
export const BLACK_HILLS_DRONE_VIDEOS = Object.freeze([
  Object.freeze({
    id: 'signal-rock',
    place: 'Signal Rock',
    corridor: 'Elk Creek / Piedmont',
    youtubeId: 'NdKwv8Nmaw0',
    verification: 'unverified-link',
    notes: 'Candidate from prior research conversation; confirm uploader, footage and exact site before geotagging.',
  }),
  Object.freeze({
    id: 'elk-creek-canyon',
    place: 'Elk Creek Canyon',
    corridor: 'Piedmont / northern Black Hills',
    youtubeId: null,
    verification: 'needs-source',
    notes: 'Video title and location are provisional; find original upload.',
  }),
  Object.freeze({
    id: 'calcite',
    place: 'Calcite',
    corridor: 'Black Hills & Fort Pierre historic network',
    youtubeId: null,
    verification: 'needs-source',
    notes: 'Candidate remembered from prior discussion; confirm location and upload.',
  }),
  Object.freeze({
    id: 'stagebarn',
    place: 'Stagebarn',
    corridor: 'Northern Black Hills',
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
