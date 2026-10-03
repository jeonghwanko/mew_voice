import { latestSavedFeedback } from './daily';
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


function normalizeReactionTime(value: string, now: Date) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_REACTION_TIME');
  const date = new Date(value.trim());
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_REACTION_TIME');
  if (!Number.isFinite(now.getTime()) || date.getTime() > now.getTime()) throw new Error('REACTION_TIME_FUTURE');
  return date.toISOString();
}

/**
 * Correct the saved time on one reaction, latest or earlier, on this observation.
 * The same reaction id, action, reaction text, and note stay. Nothing new is inserted.
 * The observation id, media, question, tags, and inference stay.
 * An empty or future time is refused and the previous time stays.
 * Stored conversation text is left untouched.
 */
export async function updateDemoFeedbackTime(observationId: string, feedbackId: string, happenedAt: string, version: number, now = new Date()): Promise<FeedbackRecord> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    if (!data.observations.some(item => item.id === observationId)) throw new Error('NOT_FOUND');
    const index = data.feedback.findIndex(item => item.id === feedbackId && item.observationId === observationId);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.feedback[index];
    if (feedbackVersion(current) !== version) throw new Error('EDIT_CONFLICT');
    const recordedAt = normalizeReactionTime(happenedAt, now);
    const updated: FeedbackRecord = { ...current, happenedAt: recordedAt, createdAt: recordedAt, version: feedbackVersion(current) + 1 };
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

function retargetCitation(ids: readonly string[], from: string, to: string) {
  return ids.map(id => id === from ? to : id);
}

/**
 * Move one saved reaction onto another observation the caregiver already has.
 * The same reaction id, action, reaction text, note, and time stay. Nothing is copied or inserted.
 * The old observation no longer lists it. This does not create an observation or a cat.
 * When this pair was the newest saved reaction on the old observation, conversations and
 * inferences that cited that observation now cite the observation it belongs to.
 * Stored answer text stays. The existing citation refresh reads the newest pair there.
 */
export async function moveDemoFeedback(observationId: string, feedbackId: string, targetObservationId: string, version: number): Promise<FeedbackRecord> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    if (typeof targetObservationId !== 'string' || !targetObservationId.trim()) throw new Error('INVALID_REACTION_OBSERVATION');
    const targetId = targetObservationId.trim();
    if (!data.observations.some(item => item.id === observationId)) throw new Error('NOT_FOUND');
    if (!data.observations.some(item => item.id === targetId)) throw new Error('NOT_FOUND');
    if (targetId === observationId) throw new Error('INVALID_REACTION_OBSERVATION');
    const index = data.feedback.findIndex(item => item.id === feedbackId && item.observationId === observationId);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.feedback[index];
    if (feedbackVersion(current) !== version) throw new Error('EDIT_CONFLICT');
    const sourceRows = data.feedback.filter(item => item.observationId === observationId);
    const follow = latestSavedFeedback(sourceRows)?.id === feedbackId;
    const updated: FeedbackRecord = { ...current, observationId: targetId, version: feedbackVersion(current) + 1 };
    data.feedback[index] = updated;
    if (follow) {
      for (const conversation of data.conversations) {
        if (!conversation.citedObservationIds.includes(observationId)) continue;
        conversation.citedObservationIds = retargetCitation(conversation.citedObservationIds, observationId, targetId);
      }
      data.observations = data.observations.map(item => {
        const inference = item.inference;
        if (!inference?.citedObservationIds.includes(observationId)) return item;
        return { ...item, inference: { ...inference, citedObservationIds: retargetCitation(inference.citedObservationIds, observationId, targetId) } };
      });
    }
    return updated;
  });
}
