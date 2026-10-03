import { setTimeout as sleep } from 'node:timers/promises';

export async function playResponse(res, operation) {
  // Never include raw OAuth/provider bodies or help tokens in logs.
  if (!res.ok) {
    const details = await res.json().catch(() => ({}));
    const reason = typeof details.error?.message === 'string' ? details.error.message.split('Help Token:')[0].slice(0, 600) : '';
    const error = new Error(`${operation} failed (HTTP ${res.status}) ${reason}`);
    error.editExpired = res.status === 400 && /^This edit has expired, please create a new Edit\./i.test(reason.trim());
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

// A new edit from the same account, or a Console change, can invalidate an upload.
// Retry only an explicit expiration before upload success. Later/ambiguous errors
// need inspection: the bundle may already exist or the commit may have succeeded.
export async function publishInternalDraft({ api, upload, metadata, expectedDraft, wait = sleep, log = () => {} }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const edit = await api('', 'POST', {});
    let uploaded = false;
    try {
      const current = await api(`/${edit.id}/tracks/internal`, 'GET');
      const production = await api(`/${edit.id}/tracks/production`, 'GET');
      const drafts = (current.releases || []).filter(release => release.status === 'draft');
      if (drafts.length && (!expectedDraft || drafts.length !== 1 || drafts[0].versionCodes?.length !== 1 || String(drafts[0].versionCodes[0]) !== expectedDraft)) {
        throw new Error('An internal draft already exists; provide its inspected versionCode to replace it');
      }
      const bundle = await upload(edit.id);
      uploaded = true;
      if (Number(bundle.versionCode) !== metadata.versionCode) throw new Error('Uploaded version differs from build manifest');
      await api(`/${edit.id}/tracks/internal`, 'PUT', { track: 'internal', releases: [...(current.releases || []).filter(release => release.status !== 'draft'), {
        name: `${metadata.version} (${metadata.versionCode})`, versionCodes: [String(metadata.versionCode)], status: 'draft',
      }] });
      // Preserve the existing, explicit production-draft replacement policy.
      const matchingProduction = (production.releases || []).filter(release => release.status === 'draft' && release.versionCodes?.length === 1 && String(release.versionCodes[0]) === expectedDraft);
      if (matchingProduction.length === 1) {
        await api(`/${edit.id}/tracks/production`, 'PUT', { track: 'production', releases: production.releases.map(release => release === matchingProduction[0]
          ? { ...release, name: `MewVoice ${metadata.version} (${metadata.versionCode})`, versionCodes: [String(metadata.versionCode)] } : release) });
      }
      await api(`/${edit.id}:validate`, 'POST');
      await api(`/${edit.id}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`, 'POST');
      return;
    } catch (error) {
      await api(`/${edit.id}`, 'DELETE').catch(() => {});
      if (!error.editExpired || uploaded || attempt === 3) throw error;
      log(`Play edit expired during upload preparation/upload; retrying with a fresh edit (${attempt + 1}/3). Avoid concurrent Play Console or edit-based API operations.`);
      await wait(attempt * 5000);
    }
  }
}
