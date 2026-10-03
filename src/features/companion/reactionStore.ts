import { changeDemo, type FeedbackRecord } from './demo';

export type UpdateDemoFeedbackInput = { version: number; action: string; reaction: string; note?: string | null };

/** Local compare-and-swap. Records saved before versions existed count as 1. */
export function feedbackVersion(item: object | null | undefined) {
  const version = item && 'version' in item ? item.version : undefined;
  return typeof version === 'number' && Number.isInteger(version) && version >= 1 ? version : 1;
}

function normalize(input: { action: string; reaction: string; note?: string | null }) {
  const action = input.action.trim();
  const reaction = input.reaction.trim();
  const note = input.note?.trim() || null;
  if (!action || !reaction || action.length > 500 || reaction.length > 500 || (note?.length ?? 0) > 2000) throw new Error('INVALID_FEEDBACK');
  return { action, reaction, note };
}

/**
 * Replace one saved reaction on this observation in place.
 * A later pair stays. A stale version or a missing observation is not rewritten.
 * Stored conversation text is left untouched.
 */
export async function updateDemoFeedback(observationId: string, feedbackId: string, input: UpdateDemoFeedbackInput) {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    if (!data.observations.some(item => item.id === observationId)) throw new Error('NOT_FOUND');
    const index = data.feedback.findIndex(item => item.id === feedbackId && item.observationId === observationId);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.feedback[index];
    if (feedbackVersion(current) !== input.version) throw new Error('EDIT_CONFLICT');
    const normalized = normalize(input);
    const updated: FeedbackRecord = { ...current, ...normalized, version: feedbackVersion(current) + 1 };
    data.feedback[index] = updated;
    return updated;
  });
}

/**
 * Remove that reaction. Nothing is inserted in its place.
 * Later reactions, the media, and the cat stay. A missing row is already gone.
 * A stale version is left as saved. Stored conversation text is left untouched.
 */
export async function deleteDemoFeedback(observationId: string, feedbackId: string, version: number) {
  return changeDemo(data => {
    const index = data.feedback.findIndex(item => item.id === feedbackId && item.observationId === observationId);
    if (index < 0) return;
    const current = data.feedback[index];
    if (feedbackVersion(current) !== version) throw new Error('EDIT_CONFLICT');
    data.feedback.splice(index, 1);
  });
}
