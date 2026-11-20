import { execFileSync } from 'node:child_process';

/** Read-only fork/upstream drift report. This never fetches, merges or resets. */
function git(...args) {
  try { return execFileSync('git', args, { encoding: 'utf8', timeout: 15000 }).trim(); }
  catch (error) { return { error: String(error.message || error) }; }
}
export function auditUpstream() {
  const remotes = git('remote', '-v');
  const branch = git('branch', '--show-current');
  const status = git('status', '--porcelain=v1');
  const upstream = git('rev-parse', '--verify', 'upstream/main');
  const origin = git('rev-parse', '--verify', 'origin/main');
  const drift = typeof upstream === 'string' && typeof origin === 'string'
    ? git('rev-list', '--left-right', '--count', 'origin/main...upstream/main')
    : { error: 'Missing origin/main or upstream/main; configure/fetch remotes manually' };
  return { branch, remotes, localChanges: status, upstream, origin, drift, note: 'No upstream changes have been merged' };
}
if (process.argv[1]?.endsWith('audit-upstream.mjs')) console.log(JSON.stringify(auditUpstream(), null, 2));
