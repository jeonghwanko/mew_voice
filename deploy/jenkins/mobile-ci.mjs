import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mobile = root;
const signing = path.resolve(root, '../signing/jenkins/findthem');
const artifacts = path.join(root, 'artifacts');
const env = process.env;
const run = (cmd, args, cwd = mobile, extra = {}) => execFileSync(cmd, args, { cwd, stdio: 'inherit', ...extra });
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const need = file => { if (!fs.existsSync(file)) throw new Error(`Required build input missing: ${path.basename(file)}`); return file; };

export function buildNumber(value) {
  const number = value?.trim() || '';
  if (!/^[1-9]\d*$/.test(number) || !Number.isSafeInteger(Number(number)) || Number(number) > 2100000000) {
    throw new Error('STORE_BUILD_NUMBER must be an integer from 1 to 2100000000');
  }
  return Number(number);
}

export function reserveBuildNumber(file, requested = '') {
  // Migration baseline is the inspected public build 86. Timestamp drafts were never released.
  const previous = fs.existsSync(file) ? buildNumber(String(json(file).lastBuildNumber)) : 86;
  const next = buildNumber(requested || String(previous + 1));
  if (next <= previous) throw new Error('Build number must exceed the reserved counter');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify({ lastBuildNumber: next })}\n`, { flag: 'wx' });
  fs.renameSync(temporary, file);
  return next;
}

export function validateReleaseVersion(version, previous = '1.1.86') {
  const parse = value => {
    if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error('Expected major.minor.patch app version');
    return value.split('.').map(Number);
  };
  const current = parse(version), baseline = parse(previous);
  const difference = current.map((part, index) => part - baseline[index]).find(part => part !== 0) || 0;
  if (difference <= 0) throw new Error(`App version must exceed existing store version ${previous}`);
}

export function patchSigning(source) {
  // Expo configures BOTH buildTypes.debug and buildTypes.release with the debug
  // key. Only replace the release block; debug must retain its development key.
  const releaseSigning = /(\brelease\s*\{[^{}]*?\bsigningConfig\s+)signingConfigs\.debug\b/g;
  if ([...source.matchAll(releaseSigning)].length !== 1 || !source.includes('signingConfigs {')) {
    throw new Error('Unexpected Expo Gradle signing template; refusing a debug-signed release');
  }
  return `def releaseProperties = new Properties()\nreleaseProperties.load(new FileInputStream(rootProject.file('keystore.properties')))\n${source}`
    .replace('signingConfigs {', `signingConfigs {
        release {
            storeFile file(releaseProperties['storeFile'])
            storePassword releaseProperties['storePassword']
            keyAlias releaseProperties['keyAlias']
            keyPassword releaseProperties['keyPassword']
        }`)
    .replace(releaseSigning, '$1signingConfigs.release');
}

function appleAuth() {
  for (const key of ['ASC_API_KEY_ID', 'ASC_API_ISSUER_ID', 'APPLE_TEAM_ID']) {
    if (!/^[A-Za-z0-9-]+$/.test(env[key] || '')) throw new Error(`Missing or invalid ${key}`);
  }
  return ['-allowProvisioningUpdates', '-authenticationKeyPath', need(env.ASC_API_KEY_PATH || path.join(signing, `AuthKey_${env.ASC_API_KEY_ID}.p8`)),
    '-authenticationKeyID', env.ASC_API_KEY_ID, '-authenticationKeyIssuerID', env.ASC_API_ISSUER_ID];
}

function prepare() {
  if (!['android', 'ios', 'both'].includes(env.BUILD_TARGET)) throw new Error('Invalid BUILD_TARGET');
  if (env.EXPO_PUBLIC_API_URL !== 'https://union.pryzm.gg/api') throw new Error('Release must use the production API');
  if (!env.EXPO_PUBLIC_APP_KEY) throw new Error('Missing shared API application key');
  if (env.BUILD_TARGET !== 'ios') {
    need(path.join(signing, 'findthem-release.keystore'));
    need(path.join(signing, 'keystore.properties'));
  }
  if (env.BUILD_TARGET !== 'android') appleAuth();
  const file = path.join(mobile, 'app.json');
  const app = json(file);
  validateReleaseVersion(app.expo.version);
  if (json(path.join(mobile, 'package.json')).version !== app.expo.version) throw new Error('Package and Expo app versions differ');
  if (app.expo.android.package !== 'gg.pryzm.union' || app.expo.ios.bundleIdentifier !== 'gg.pryzm.union') {
    throw new Error('Unexpected store app identity');
  }
  // disableConcurrentBuilds serializes reservations. State survives disposable checkouts.
  const number = env.SCREENSHOTS_ONLY === 'true' ? 87 : reserveBuildNumber(path.join(os.homedir(), '.mewvoice-ci/build-number.json'), env.STORE_BUILD_NUMBER);
  app.expo.android.versionCode = number;
  app.expo.ios.buildNumber = String(number);
  // Only the disposable Jenkins checkout is changed; never commit or push build numbers.
  fs.writeFileSync(file, `${JSON.stringify(app, null, 2)}\n`);
  fs.writeFileSync(path.join(mobile, '.env.production'), `EXPO_PUBLIC_API_URL=${env.EXPO_PUBLIC_API_URL}\n`);
  fs.mkdirSync(artifacts, { recursive: true });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(artifacts, 'build.json'), `${JSON.stringify({
    appId: 'gg.pryzm.union', version: app.expo.version, versionCode: number, commit,
    platform: env.BUILD_TARGET, mimiSeed: '0.19.13', jenkinsBuild: env.BUILD_URL || null,
  }, null, 2)}\n`);
}

function android() {
  const native = path.join(mobile, 'android');
  // CoffeeCong's SSH-launched agent does not export ANDROID_HOME globally.
  const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'Library/Android/sdk');
  need(path.join(sdk, 'platform-tools'));
  fs.writeFileSync(path.join(native, 'local.properties'), `sdk.dir=${sdk.replaceAll('\\', '\\\\')}\n`);
  fs.copyFileSync(need(path.join(signing, 'findthem-release.keystore')), path.join(native, 'findthem-release.keystore'));
  let properties = fs.readFileSync(need(path.join(signing, 'keystore.properties')), 'utf8');
  if (!/^storeFile\s*=/m.test(properties)) throw new Error('Missing storeFile in signing properties');
  properties = properties.replace(/^storeFile\s*=.*$/m, 'storeFile=../findthem-release.keystore');
  fs.writeFileSync(path.join(native, 'keystore.properties'), properties, { mode: 0o600 });
  const gradle = path.join(native, 'app/build.gradle');
  fs.writeFileSync(gradle, patchSigning(fs.readFileSync(gradle, 'utf8')));
  run('bash', ['./gradlew', '--no-daemon', 'assembleRelease', 'bundleRelease'], native);
  fs.copyFileSync(need(path.join(native, 'app/build/outputs/apk/release/app-release.apk')), path.join(artifacts, 'findthem.apk'));
  fs.copyFileSync(need(path.join(native, 'app/build/outputs/bundle/release/app-release.aab')), path.join(artifacts, 'findthem.aab'));
}

function ios() {
  const native = path.join(mobile, 'ios');
  run('pod', ['install'], native);
  const workspaces = fs.readdirSync(native).filter(name => name.endsWith('.xcworkspace'));
  if (workspaces.length !== 1) throw new Error('Expected exactly one generated iOS workspace');
  // Expo derives the project name from app.json; never assume a legacy FindThem scheme.
  const project = fs.readdirSync(native).filter(name => name.endsWith('.xcodeproj'));
  if (project.length !== 1) throw new Error('Expected exactly one generated iOS project');
  const list = JSON.parse(execFileSync('xcodebuild', ['-list', '-json', '-project', project[0]], { cwd: native, encoding: 'utf8' }));
  const name = project[0].replace(/\.xcodeproj$/, '');
  if (!list.project?.schemes?.includes(name)) throw new Error('Generated application scheme not found');
  const archive = path.join(native, 'build/FindThem.xcarchive');
  run('xcodebuild', ['-workspace', workspaces[0], '-scheme', name, '-configuration', 'Release',
    '-destination', 'generic/platform=iOS', '-archivePath', archive, ...appleAuth(),
    `DEVELOPMENT_TEAM=${env.APPLE_TEAM_ID}`, 'CODE_SIGN_STYLE=Automatic', 'archive'], native);
  // The old devops plist used destination=upload. Export locally so build-only never uploads.
  const plist = path.join(native, 'build/export.plist');
  fs.writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string><key>destination</key><string>export</string>
<key>teamID</key><string>${env.APPLE_TEAM_ID}</string><key>signingStyle</key><string>automatic</string>
<key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>`);
  const out = path.join(native, 'build/export');
  run('xcodebuild', ['-exportArchive', '-archivePath', archive, '-exportOptionsPlist', plist, '-exportPath', out, ...appleAuth()], native);
  const ipas = fs.readdirSync(out).filter(name => name.endsWith('.ipa'));
  if (ipas.length !== 1) throw new Error('Expected exactly one exported IPA');
  fs.copyFileSync(path.join(out, ipas[0]), path.join(artifacts, 'findthem.ipa'));
  run('ditto', ['-c', '-k', '--keepParent', path.join(archive, 'dSYMs'), path.join(artifacts, 'dSYMs.zip')]);
}

function testflight() {
  if (env.IOS_UPLOAD_TO_TESTFLIGHT !== 'true') throw new Error('TestFlight upload is not enabled');
  const native = path.join(mobile, 'ios');
  const plist = fs.readFileSync(need(path.join(native, 'build/export.plist')), 'utf8');
  const uploadPlist = path.join(native, 'build/upload.plist');
  fs.writeFileSync(uploadPlist, plist.replace('<string>export</string>', '<string>upload</string>'));
  run('xcodebuild', ['-exportArchive', '-archivePath', path.join(native, 'build/FindThem.xcarchive'),
    '-exportOptionsPlist', uploadPlist, '-exportPath', path.join(native, 'build/upload'), ...appleAuth()], native);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const actions = { prepare, android, ios, testflight };
  const action = actions[process.argv[2]];
  if (!action) throw new Error('Expected prepare, android, ios or testflight');
  action();
}
