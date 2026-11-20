# PR #4: personal photos & videos — private globe metadata foundation

## What the user wants

Explore anywhere in God's Eye View and see personally owned photos and videos
recorded near that location, with capture date/time, thumbnails, and the
ability to open an original file through a private, authorized media viewer.
The media **stays where it already lives** (workstation, LAN NAS, existing
archives). A local spatial index represents the metadata; this PR deliberately
does **not** scan, index or copy anyone's files yet.

This feature differs from PR #3's public YouTube archive: private personal
media must NEVER be committed to Git or exposed via public-hosted map endpoints.

## Proposed architecture and stages

1. **Opt-in scanner**, run on an approved private host, with configured
   allowlisted roots. Use ExifTool/ffprobe (where available) for image/video
   metadata, GPS, time zones, duration and orientation. Prefer read-only mounts.
   Never recursively scan arbitrary disks without explicit user configuration.
   Reject or skip unsupported/corrupt media; log totals without sensitive paths.
2. **Incremental SQLite catalog** outside the Git repository and any web root.
   Suggested tables: media (opaque ID, kind, filesystem locator, size, mtime,
   capture timestamp/timezone, duration, orientation, GPS provenance,
   geolocation accuracy, privacy category), roots (allowlist, trust settings,
   last successful scan), thumbnails (derivative locator, authorization).
   SQLite RTree on bounding boxes and FTS on opt-in safe descriptive fields.
   Stable IDs must not expose or hash a user's full file path into public URLs.
   On offline roots, report unavailable, do not falsely delete records.
   Dedupe based on carefully bounded size/mtime then optional content hash.
3. **Private local/tailnet API**, authenticate requests and authorize records,
   including thumbnails/video playback. Search ONLY a bounded viewport and
   limit/paginate results (initially 200 max), never export an entire catalog.
   Use short-lived opaque media handles, not absolute NAS paths or direct
   SMB URLs; disallow path traversal. Return 404 for unauthorized IDs.
   Never use Vite public assets or bake private metadata into frontend bundles.
   Apply origin/CORS/CSRF protections and appropriate cache headers.
4. **Map display**: opt-in personal media layer, disabled by default, clustering
   of photo/video markers, location-confidence styling, time-range filters,
   thumbnail preview and owner-authorized Open Original action. Defer remote
   thumbnails/playback until server-side access policy is proven. Handle
   anti-meridian viewports, screen bounds, camera movement debounce and
   viewport pagination; never fetch unbounded results.
5. **Records with no GPS**: organize into an Unlocated media queue. Do not
   invent coordinates or place media at the current map center. Offer
   manual geotagging in a later, explicit edit flow, preserving the original
   metadata and the reason for any inference.
6. **Privacy:** EXIF often reveals homes, caregivers, medical details and exact
   locations. Keep personal metadata off public sites, demo recordings,
   analytics, share URLs, voice-agent contexts, and third-party APIs by
   default. Add owner-controlled visibility scopes and an explicit private
   share workflow later, if ever approved. Do not derive recognition of people
   without separate authorization.
7. **Deployment:** prefer utility node as always-on catalog/API host if resource
   and isolation checks permit; keep prod LifeOS services segmented. The NAS
   should be reached over a reliable local LAN IP or mounted path rather than
   depending on hostname discovery. No LAN IP is embedded in source; credentials
   are configured privately. A disconnected workstation/NAS is reported as
   offline, not silently replaced by a cloud sync.

## Files added by this PR

- `src/history/personalMediaIndex.js`: pure, minimal, privacy-conscious
  viewer metadata and viewport query contract. Not wired into the map yet.
- `src/history/personalMediaIndex.test.mjs`: input validation and privacy tests.

## Scope and acceptance gates for the next implementation PR

- Agree on approved scan roots, API host, media volume and ownership/permission
  model before running any scan.
- Build opt-in scanner and backend privately; test with synthetic fixtures,
  not real personal images in CI.
- Prove zero source-file mutation, zero media uploads, no external requests from
  the scanner, and no unauthenticated remote enumeration.
- Verify GPS/no-GPS handling, timezone changes, mobile support, paginated
  viewport discovery, thumbnail/video access and offline-drive behavior.
- Hook the UI into DataLayerManager only after auth gates and lifecycle
  tests pass. Never enable this layer on public caregiver or guest surfaces.
- Run `node --test src/history/personalMediaIndex.test.mjs`, full project
  tests and build, then review the access boundaries before merging.

## Related work

- PR #2: public abandoned-railroad geometry overlays.
- PR #3: public YouTube research-video archive.
- Future: allow owner-only filtering of personal videos by proximity to
  historic railway segments, and compare by filming year or historical year.
