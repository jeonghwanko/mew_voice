import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildNumber, reserveBuildNumber, validateReleaseVersion, patchSigning } from './mobile-ci.mjs';
import { playResponse, publishInternalDraft } from './play-edit.mjs';

test('marketing version exceeds prior 1.1.86 numerically', () => {
  for (const version of ['1.1.0', '1.1.1', '1.1.86']) assert.throws(() => validateReleaseVersion(version));
  for (const version of ['1.1.87', '1.2.0', '2.0.0']) assert.doesNotThrow(() => validateReleaseVersion(version));
});

test('store versions never use the resettable Jenkins job number', () => {
  assert.throws(() => buildNumber(''));
  assert.equal(buildNumber('42'), 42);
  for (const value of ['0', '-1', '1.5', 'abc', '2100000001', '1; exit']) {
    assert.throws(() => buildNumber(value));
  }
});

test('durable build counter starts after public 86 and advances by one', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mewvoice-counter-'));
  const file = path.join(directory, 'counter.json');
  try {
    assert.equal(reserveBuildNumber(file), 87);
    assert.equal(reserveBuildNumber(file), 88);
    assert.throws(() => reserveBuildNumber(file, '88'));
    assert.equal(reserveBuildNumber(file), 89);
    assert.equal(reserveBuildNumber(file, '91'), 91);
    assert.equal(reserveBuildNumber(file), 92);
  } finally { fs.unlinkSync(file); fs.rmdirSync(directory); }
});
test('release signing survives Expo regeneration without using debug keys', () => {
  const template = `android {
    signingConfigs { debug { storeFile file('debug.keystore') } }
    buildTypes {
      debug { signingConfig signingConfigs.debug }
      release {
        // Caution! In production, you need to generate your own keystore file.
        signingConfig signingConfigs.debug
      }
    }
  }`;
  const patched = patchSigning(template);
  assert.match(patched, /signingConfig signingConfigs.release/);
  assert.match(patched, /debug \{ signingConfig signingConfigs.debug \}/);
  assert.equal((patched.match(/signingConfig signingConfigs.debug/g) || []).length, 1);
  assert.throws(() => patchSigning(patched));
  assert.throws(() => patchSigning('changed upstream template'));
});

const expiration = () => playResponse(new Response(JSON.stringify({ error: {
  message: 'This edit has expired, please create a new Edit. Help Token: secret-help-token',
} }), { status: 400 }), 'Play bundle upload');

function playFixture({ upload, internal, production = { releases: [] }, failRequest } = {}) {
  const calls = [];
  let edits = 0;
  const options = {
    metadata: { version: '1.2.0', versionCode: 90 }, expectedDraft: '87',
    wait: async milliseconds => { calls.push({ wait: milliseconds }); },
    api: async (url, method, body) => {
      calls.push({ url, method, body });
      if (failRequest) await failRequest(url, method);
      if (url === '' && method === 'POST') return { id: `edit-${++edits}` };
      if (method === 'GET' && url.endsWith('/internal')) return internal ? internal(edits) : { releases: [] };
      if (method === 'GET' && url.endsWith('/production')) return production;
      return {};
    },
    upload: async id => {
      calls.push({ upload: id });
      return upload ? upload(id) : { versionCode: 90 };
    },
  };
  return { calls, run: () => publishInternalDraft(options) };
}

test('expired Play upload retries a new edit and rereads tracks before committing a draft', async () => {
  const live = { name: 'live', status: 'completed', versionCodes: ['86'] };
  const unrelated = { status: 'draft', versionCodes: ['85'] };
  const fixture = playFixture({
    upload: id => id === 'edit-1' ? expiration() : { versionCode: 90 },
    internal: attempt => ({ releases: [{ ...live, name: `live-${attempt}` }, { status: 'draft', versionCodes: ['87'] }] }),
    production: { releases: [live, unrelated] },
  });
  await fixture.run();
  assert.deepEqual(fixture.calls.filter(call => call.upload).map(call => call.upload), ['edit-1', 'edit-2']);
  assert.deepEqual(fixture.calls.filter(call => call.wait), [{ wait: 5000 }]);
  assert.ok(fixture.calls.some(call => call.url === '/edit-1' && call.method === 'DELETE'));
  const writes = fixture.calls.filter(call => call.method === 'PUT');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].url, '/edit-2/tracks/internal');
  assert.deepEqual(writes[0].body.releases, [{ ...live, name: 'live-2' }, { name: '1.2.0 (90)', versionCodes: ['90'], status: 'draft' }]);
  assert.deepEqual(fixture.calls.filter(call => call.url?.includes(':commit')).map(call => call.url), ['/edit-2:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW']);
});

test('Play retries stop after three expired edits, even when cleanup fails', async () => {
  const fixture = playFixture({ upload: expiration, failRequest: async (_, method) => {
    if (method === 'DELETE') throw new Error('Cleanup failed');
  } });
  await assert.rejects(fixture.run(), /This edit has expired/);
  assert.equal(fixture.calls.filter(call => call.upload).length, 3);
  assert.deepEqual(fixture.calls.filter(call => call.wait).map(call => call.wait), [5000, 10000]);
});

test('a draft changed by another writer blocks the retry before a second upload', async () => {
  const fixture = playFixture({ upload: expiration, internal: attempt => ({ releases: [
    { status: 'draft', versionCodes: [attempt === 1 ? '87' : '89'] },
  ] }) });
  await assert.rejects(fixture.run(), /inspected versionCode/);
  assert.equal(fixture.calls.filter(call => call.upload).length, 1);
  assert.equal(fixture.calls.filter(call => call.method === 'PUT').length, 0);
});

test('Play permission, version, review and network errors are not retried', async () => {
  for (const [status, message] of [[403, 'Permission denied'], [400, 'Version code already used'], [400, 'You already have changes in review']]) {
    const fixture = playFixture({ upload: () => playResponse(new Response(JSON.stringify({ error: { message } }), { status }), 'Play bundle upload') });
    await assert.rejects(fixture.run(), error => error.editExpired === false);
    assert.equal(fixture.calls.filter(call => call.upload).length, 1);
  }
  const fixture = playFixture({ upload: async () => { throw new Error('fetch failed'); } });
  await assert.rejects(fixture.run(), /fetch failed/);
  assert.equal(fixture.calls.filter(call => call.upload).length, 1);
});

test('expiration after successful upload and ambiguous commit failures are not replayed', async () => {
  for (const stage of ['/tracks/internal', ':validate', ':commit']) {
    const fixture = playFixture({ failRequest: async (url, method) => {
      if (method !== 'GET' && url.includes(stage)) await expiration();
    } });
    await assert.rejects(fixture.run(), /This edit has expired/);
    assert.equal(fixture.calls.filter(call => call.upload).length, 1);
  }
  const fixture = playFixture({ failRequest: async url => {
    if (url.includes(':commit')) throw new Error('Commit response timed out');
  } });
  await assert.rejects(fixture.run(), /Commit response timed out/);
  assert.equal(fixture.calls.filter(call => call.upload).length, 1);
});

test('Play responses redact help tokens and reject unrelated expiration text', async () => {
  await assert.rejects(expiration(), error => error.editExpired === true && !error.message.includes('secret-help-token'));
  await assert.rejects(playResponse(new Response(JSON.stringify({ error: { message: 'OAuth token expired' } }), { status: 400 }), 'Play authentication'), error => error.editExpired === false);
  assert.equal(await playResponse(new Response(null, { status: 204 }), 'Delete edit'), null);
});

test('upload manifest mismatch prevents all track writes', async () => {
  const fixture = playFixture({ upload: async () => ({ versionCode: 91 }) });
  await assert.rejects(fixture.run(), /differs from build manifest/);
  assert.equal(fixture.calls.filter(call => call.method === 'PUT').length, 0);
  assert.equal(fixture.calls.filter(call => call.upload).length, 1);
});

test('only the explicitly inspected production draft is replaced', async () => {
  const live = { status: 'completed', versionCodes: ['86'] };
  const other = { status: 'draft', versionCodes: ['85'] };
  const fixture = playFixture({ production: { releases: [live, other, { status: 'draft', versionCodes: ['87'], releaseNotes: [{ language: 'ko-KR', text: '기존 노트' }] }] } });
  await fixture.run();
  const write = fixture.calls.find(call => call.method === 'PUT' && call.url.endsWith('/production'));
  assert.deepEqual(write.body.releases, [live, other, { status: 'draft', versionCodes: ['90'], name: 'MewVoice 1.2.0 (90)', releaseNotes: [{ language: 'ko-KR', text: '기존 노트' }] }]);
});
