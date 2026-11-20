import { execFileSync } from 'node:child_process';

/** Read-only fork/upstream drift report. This never fetches, merges or resets. */
function git(...args) {
  try { return execFileSync('git', args, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch (error) { return { error: String(error.message || error) }; }
}
export function auditUpstream() {
  // Names are enough to verify configuration without printing credentials,
  // private hosts, URL query parameters, or fragments from remote URLs.
  const remotes = git('remote');
  const branch = git('branch', '--show-current');
  const status = git('status', '--porcelain=v1');
  const upstream = git('rev-parse', '--verify', 'upstream/main');
  const origin = git('rev-parse', '--verify', 'origin/main');
  const drift = typeof upstream === 'string' && typeof origin === 'string'
    ? git('rev-list', '--left-right', '--count', 'origin/main...upstream/main')
    : { error: 'Missing origin/main or upstream/main; configure/fetch remotes manually' };
  const ok = [remotes, branch, status, upstream, origin, drift].every((value) => typeof value === 'string');
  return { ok, branch, remotes, localChanges: status, upstream, origin, drift, note: 'This audit does not merge upstream changes' };
}
if (process.argv[1]?.endsWith('audit-upstream.mjs')) {
  const report = auditUpstream();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}
