import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/audit-upstream.mjs', import.meta.url));

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

test('upstream audit reports local drift without changing the checkout or exposing remote credentials', () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'gev-upstream-audit-'));
  try {
    git(cwd, 'init', '-q');
    git(cwd, 'config', 'user.email', 'audit@example.test');
    git(cwd, 'config', 'user.name', 'Audit Test');
    writeFileSync(path.join(cwd, 'tracked.txt'), 'original\n');
    git(cwd, 'add', 'tracked.txt');
    git(cwd, 'commit', '-qm', 'Base');
    const base = git(cwd, 'rev-parse', 'HEAD');
    git(cwd, 'update-ref', 'refs/remotes/origin/main', base);
    git(cwd, 'update-ref', 'refs/remotes/upstream/main', base);
    git(cwd, 'remote', 'add', 'origin', 'https://user:secret@example.test/repo.git');
    git(cwd, 'remote', 'add', 'upstream', 'https://example.test/upstream.git');
    git(cwd, 'remote', 'add', 'sensitive', 'ssh://user:otherSecret@example.test/private.git?token=querySecret#fragmentSecret');
    writeFileSync(path.join(cwd, 'tracked.txt'), 'changed\n');

    const before = git(cwd, 'status', '--porcelain=v1');
    const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.drift, '0\t0');
    assert.equal(report.origin, base);
    assert.equal(report.upstream, base);
    assert.equal(report.remotes, 'origin\nsensitive\nupstream');
    assert.doesNotMatch(result.stdout, /secret|example\.test|private\.git/i);
    assert.equal(report.localChanges, before);
    assert.equal(git(cwd, 'status', '--porcelain=v1'), before);
    assert.equal(git(cwd, 'rev-parse', 'HEAD'), base);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('upstream audit fails honestly when required refs are unavailable', () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'gev-upstream-audit-'));
  try {
    git(cwd, 'init', '-q');
    const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, false);
    assert.match(report.drift.error, /Missing origin\/main or upstream\/main/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
