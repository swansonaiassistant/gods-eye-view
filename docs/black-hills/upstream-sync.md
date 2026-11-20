# Upstream drift audit

Run `node scripts/audit-upstream.mjs` from a checkout after verifying and fetching the `origin` and `upstream` remotes. The helper reports the current branch, worktree changes, remote URLs, local main refs, and the commit counts in `origin/main...upstream/main`. It never fetches, merges, resets or alters settings. Embedded HTTPS credentials in remote URLs are redacted. The command exits nonzero when a Git command or required ref is unavailable; its output then records the missing evidence.

Reference: https://github.com/bilawalsidhu/gods-eye-view

The counts describe locally fetched refs, so fetch before comparing. Next: assess new upstream features, conflicts and licenses against our fork, port narrowly, test Cesium behavior and attribution, and protect local modifications and secret `.env` files. No upstream code is merged in this PR.

## Merge acceptance

Verify the report in a real checkout, the missing-ref failure state, credential redaction, unit tests, and the project build. This PR adds only an audit command; it does not add a data source or globe layer.
