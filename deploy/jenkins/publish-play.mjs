// Google Play internal draft only. Uses Node's crypto/fetch; no Jenkins publisher plugin.
import fs from 'node:fs';
import { createSign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { playResponse as response, publishInternalDraft } from './play-edit.mjs';

if (process.env.ANDROID_PUBLISH_TO_GOOGLEPLAY !== 'true') throw new Error('Play upload is not enabled');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifactDir = process.env.ARTIFACT_DIR || path.join(root, 'artifacts');
const metadata = JSON.parse(fs.readFileSync(path.join(artifactDir, 'build.json'), 'utf8'));
if (metadata.appId !== 'gg.pryzm.union') throw new Error('Unexpected app identity');
const sa = JSON.parse(fs.readFileSync(process.env.PLAY_SERVICE_ACCOUNT, 'utf8'));
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email,
  scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
const token = await response(await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  signal: AbortSignal.timeout(30000),
}), 'Play authentication');
const base = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/gg.pryzm.union/edits';
const auth = { Authorization: `Bearer ${token.access_token}` };
async function api(url, method, body) {
  return response(await fetch(url, { method, headers: { ...auth, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) }), 'Play edit');
}
// Load once before opening an edit; every retry uses the identical signed binary.
const aab = fs.readFileSync(path.join(artifactDir, 'findthem.aab'));
await publishInternalDraft({
  api: (suffix, method, body) => api(`${base}${suffix}`, method, body),
  upload: async editId => response(await fetch(`https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/gg.pryzm.union/edits/${editId}/bundles?uploadType=media`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/octet-stream' }, body: aab, signal: AbortSignal.timeout(600000),
  }), 'Play bundle upload'),
  metadata,
  expectedDraft: process.env.REPLACE_INTERNAL_DRAFT_VERSION,
  log: message => process.stdout.write(`${message}\n`),
});
process.stdout.write(`Google Play internal draft uploaded: ${metadata.appId} ${metadata.versionCode}\n`);
