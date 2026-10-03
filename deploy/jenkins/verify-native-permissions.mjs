import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Inspect resolved plugins, not just app.json: a later plugin can remove a permission.
// Keep the full config in memory because it also contains application configuration.
const config = JSON.parse(execFileSync(process.execPath, [path.join(mobile, 'node_modules/expo/bin/cli'), 'config', '--type', 'introspect', '--json'], { cwd: mobile, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
const results = config._internal.modResults;
if (!results.ios.infoPlist.NSMicrophoneUsageDescription) throw new Error('iOS microphone purpose string is missing');
const permissions = results.android.manifest.manifest['uses-permission'].map(item => item.$);
if (!permissions.some(item => item['android:name'] === 'com.google.android.gms.permission.AD_ID' && item['tools:node'] === 'remove')) throw new Error('Unused advertising ID permission must be removed');
if (!permissions.some(item => item['android:name'] === 'android.permission.RECORD_AUDIO' && item['tools:node'] !== 'remove')) throw new Error('Android microphone permission was removed by a config plugin');
for (const permission of ['FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'FOREGROUND_SERVICE_MICROPHONE']) {
  if (!permissions.some(item => item['android:name'] === `android.permission.${permission}` && item['tools:node'] === 'remove')) throw new Error(`Unused ${permission} must be removed`);
}
process.stdout.write('Resolved native permissions verified: microphone enabled, unused foreground services removed.\n');
