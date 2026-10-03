// Operations for this job only. Credentials stay in the user's Mimi Seed directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const base = 'http://100.106.148.39:8080'; // office-stable Tailscale address
const job = `${base}/job/findthem-mobile`;
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.mimi-seed/jenkins.json'), 'utf8'));
if (!['http://192.168.30.23:8080', base].includes(cfg.url.replace(/\/$/, ''))) throw new Error('Expected office-stable credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${cfg.username}:${cfg.token}`).toString('base64')}` };
async function request(url, options = {}) {
  const r = await fetch(url, { ...options, headers: { ...headers, ...options.headers }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  if (r.status >= 400) throw new Error(`Jenkins HTTP ${r.status}`);
  return r;
}
const out = value => process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`);
const [action, value, platform = 'both'] = process.argv.slice(2);
if (action === 'sync') {
  const script = fs.readFileSync(path.join(dir, 'Jenkinsfile.mobile'), 'utf8');
  const checked = await request(`${base}/pipeline-model-converter/validate`, { method: 'POST', body: new URLSearchParams({ jenkinsfile: script }) });
  const validation = await checked.text();
  if (!validation.includes('Jenkinsfile successfully validated.')) throw new Error(validation);
  out(validation.trim());
  const xmlEscape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const desired = fs.readFileSync(path.join(dir, 'job.mobile.xml'), 'utf8');
  const live = await request(job + '/config.xml');
  let template = await live.text();
  const parameters = desired.match(/<hudson\.model\.ParametersDefinitionProperty>[\s\S]*?<\/hudson\.model\.ParametersDefinitionProperty>/)?.[0];
  if (!parameters || !template.includes('<hudson.model.ParametersDefinitionProperty>')) throw new Error('Missing expected job parameters');
  template = template.replace(/<hudson\.model\.ParametersDefinitionProperty>[\s\S]*?<\/hudson\.model\.ParametersDefinitionProperty>/, () => parameters);
  const xml = template.replace(/<definition\b[\s\S]*?<\/definition>/, () =>
    `<definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps"><script>${xmlEscape(script)}</script><sandbox>true</sandbox></definition>`);
  await request(`${job}/config.xml`, { method: 'POST', headers: { 'Content-Type': 'application/xml; charset=utf-8' }, body: xml });
  out('findthem-mobile configuration synchronized; no build triggered');
} else if (action === 'credential') {
  if (!['findthem-appstore-p8', 'findthem-googleplay-json'].includes(value)) throw new Error('Only FindThem store credential IDs are allowed');
  const input = fs.readFileSync(path.resolve(platform));
  const listing = await (await request(`${base}/credentials/store/system/domain/_/api/json?tree=credentials[id]`)).json();
  if (listing.credentials.some(c => c.id === value)) throw new Error('Credential already exists; refusing implicit overwrite');
  const form = new FormData();
  form.append('json', JSON.stringify({ credentials: { scope: 'GLOBAL', id: value, description: 'FindThem gg.pryzm.union store upload',
    file: 'file0', $class: 'org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl',
    'stapler-class': 'org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl' } }));
  form.append('file0', new Blob([input]), path.basename(platform));
  await request(`${base}/credentials/store/system/domain/_/createCredentials`, { method: 'POST', body: form });
  const confirmed = await (await request(`${base}/credentials/store/system/domain/_/api/json?tree=credentials[id]`)).json();
  if (!confirmed.credentials.some(c => c.id === value)) throw new Error('Credential registration was not confirmed');
  out(`Registered ${value}; secret not displayed`);
} else if (action === 'trigger' || action === 'build' || action === 'screenshots') {
  if (!/^[a-f0-9]{40}$/i.test(value || '')) throw new Error('A full source commit SHA is required');
  if (!['both', 'android', 'ios'].includes(platform)) throw new Error('Invalid platform');
  const replaceDraft = process.argv[5] || '';
  if (replaceDraft && !/^[1-9]\d*$/.test(replaceDraft)) throw new Error('Expected inspected draft versionCode');
  const r = await request(`${job}/buildWithParameters`, { method: 'POST', body: new URLSearchParams({
    SRC_GIT_URL: process.env.MEW_VOICE_GIT_URL || "https://github.com/jeonghwanko/mew_voice.git", SRC_GIT_COMMIT: value, BUILD_TARGET: platform,
    REPLACE_INTERNAL_DRAFT_VERSION: replaceDraft,
    SCREENSHOTS_ONLY: String(action === 'screenshots'),
    ANDROID_PUBLISH_TO_GOOGLEPLAY: String(action === 'trigger' && platform !== 'ios'),
    IOS_UPLOAD_TO_TESTFLIGHT: String(action === 'trigger' && platform !== 'android'),
  }) });
  if (r.status !== 201) throw new Error(`Unexpected trigger response ${r.status}`);
  out({ queue: r.headers.get('location') });
} else if (action === 'queue') {
  if (!/^\d+$/.test(value)) throw new Error('Expected queue ID');
  out(await (await request(`${base}/queue/item/${value}/api/json?tree=cancelled,why,executable[number,url]`)).json());
} else if (action === 'status') {
  if (!/^\d+$/.test(value)) throw new Error('Expected build number');
  out(await (await request(`${job}/${value}/api/json?tree=number,building,result,duration,artifacts[fileName],url`)).json());
} else if (action === 'log') {
  if (!/^\d+$/.test(value)) throw new Error('Expected build number');
  const log = await (await request(`${job}/${value}/consoleText`)).text();
  const lines = log.replaceAll('\r', '\n').split('\n').filter(line => line.replace(/^\[[^\]]+\]\s*/, '').trim());
  const selected = platform === 'errors'
    ? lines.filter((_, i) => lines.slice(Math.max(0, i - 8), i + 1).some(line => /FAILURE:|What went wrong|error:|Error:/.test(line)))
    : lines.slice(-60);
  out(selected.map(line => line.slice(0, 500)).join('\n'));
} else if (action === 'stop') {
  if (!/^\d+$/.test(value)) throw new Error('Expected build number');
  const result = await request(`${job}/${value}/stop`, { method: 'POST' });
  out({ stopRequested: value, status: result.status });
} else if (action === 'artifact-copy-support') {
  const plugins = await (await request(`${base}/pluginManager/api/json?tree=plugins[shortName,active]`)).json();
  out(plugins.plugins.filter(item => item.shortName === 'copyartifact'));
} else if (action === 'agent-status') {
  const status = await (await request(`${base}/computer/api/json?tree=computer[displayName,offline,temporarilyOffline,offlineCauseReason]`)).json();
  out(status.computer.filter(item => item.displayName === 'svl-mac-01'));
} else if (action === 'download-review-artifacts' || action === 'download-play-artifacts') {
  if (!/^\d+$/.test(value)) throw new Error('Expected build number');
  const listing = await (await request(`${job}/${value}/api/json?tree=artifacts[fileName,relativePath]`)).json();
  const allowed = new Set(action === 'download-play-artifacts' ? ['build.json', 'findthem.aab'] : ['build.json', 'screenshots.json', 'iphone-welcome.png', 'ipad-welcome.png']);
  const output = action === 'download-play-artifacts' ? path.resolve(dir, '../../artifacts', `recovery-${value}`) : path.resolve(dir, '../../brands/mewvo/release', `native-${value}`);
  fs.mkdirSync(output, { recursive: true });
  for (const item of listing.artifacts.filter(item => allowed.has(item.fileName))) {
    const response = await request(`${job}/${value}/artifact/${item.relativePath.split('/').map(encodeURIComponent).join('/')}`);
    fs.writeFileSync(path.join(output, item.fileName), Buffer.from(await response.arrayBuffer()));
    out(`Saved ${item.fileName}`);
  }
} else if (action === 'progress') {
  if (!/^\d+$/.test(value)) throw new Error('Expected build number');
  const r = await (await request(`${job}/${value}/wfapi/describe`)).json();
  out({ status: r.status, stages: r.stages?.map(s => ({ name: s.name, status: s.status })) });
} else throw new Error('Expected sync, trigger <SHA> [both|android|ios], queue <ID>, status <N>, log <N>');
