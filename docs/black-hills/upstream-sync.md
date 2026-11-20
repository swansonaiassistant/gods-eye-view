# upstream sync — preliminary research and implementation

Upstream synchronization is an audit-first exercise. Run `node scripts/audit-upstream.mjs` from a checkout after verifying the `upstream` remote and fetching it. The helper is read-only and reports drift, worktree status and remotes; it does not fetch, merge, reset or alter settings.

Reference: https://github.com/bilawalsidhu/gods-eye-view

Next: assess new upstream features, conflicts and licenses against our fork, cherry-pick narrowly, test Cesium behavior and attribution, protect local modifications and secret `.env` files. No upstream code has been merged in this PR.

## Merge acceptance

Verify actual data response, source reuse constraints, schema, error states, tests, and Cesium browser performance before marking this feature ready. This PR is deliberately draft and isolated from LifeOS.
