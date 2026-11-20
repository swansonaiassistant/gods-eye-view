# Black Hills historical railroad drone archive — foundation (PR #3)

This draft feature exposes a small, opt-in archival research panel. It does not
copy, download, rehost, or embed another creator's videos. Candidate clips open
on YouTube in a separate tab.

## Research candidates

- Signal Rock / Elk Creek / Piedmont: prior-conversation candidate YouTube ID
  `NdKwv8Nmaw0`; **not independently verified in this PR**.
- Elk Creek Canyon: source link and uploader not confirmed.
- Calcite: source link and uploader not confirmed.
- Stagebarn: source link and uploader not confirmed.

All four were recalled in conversation, not independently checked. Do not
present them as a verified creator playlist or assume the precise locations.

## Why locations aren't pinned yet

A place name alone does not establish the camera's GPS position, railroad
segment, flight route or video timestamp. PR #2 is separate and must not be
silently assumed to be merged. The archive can be opened without that layer.
After sourcing the originals, add vetted per-video coordinates, line-segment
references, creator/channel/title, recording date, verified source URL and
optional timestamp anchors. Then link the archive to PR #2's historical
railroad entities and enable location markers and optional iframe embeds only
when source permissions / YouTube embedding policies allow.

Do not imply that drone footage proves legal access to land or that the
historic alignment is survey-accurate.

## Verification

- `node --test src/history/blackHillsVideoCatalog.test.mjs`
- `npm test` and `npm run build`
- Browser: panel open/close, accessible expanded state, outbound link safety,
  mobile layout, collision with existing controls.
- Check candidate video availability and identify the creator before making
  this PR ready to merge.
