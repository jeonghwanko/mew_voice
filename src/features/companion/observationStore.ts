import { changeDemo, type DemoObservation } from './demo';

export type RemovedDemoObservation = Pick<DemoObservation, 'localPhotoUri' | 'localAudioUri' | 'localVideoUri'>;

/** Same situation chips as the capture screen. A saved tag outside this list can stay only if it was already on that observation. */
export const OBSERVATION_CONTEXT_TAGS = ['식사 전', '식사 후', '놀이 중', '쉬는 중', '창가에서', '낯선 소리', '귀가 후'] as const;

const QUESTION_LIMIT = 1500;

export type UpdateDemoObservationCaptionInput = { question: string; contextTags: readonly string[] };

function normalizeCaption(input: UpdateDemoObservationCaptionInput, existingTags: readonly string[]) {
  if (typeof input.question !== 'string' || !Array.isArray(input.contextTags)) throw new Error('INVALID_OBSERVATION_CAPTION');
  const question = input.question.trim();
  if (question.length > QUESTION_LIMIT) throw new Error('INVALID_OBSERVATION_CAPTION');
  const allowed = new Set<string>([...OBSERVATION_CONTEXT_TAGS, ...existingTags.map(tag => tag.trim()).filter(Boolean)]);
  const contextTags: string[] = [];
  for (const raw of input.contextTags) {
    if (typeof raw !== 'string') throw new Error('INVALID_OBSERVATION_CAPTION');
    const tag = raw.trim();
    if (!tag || !allowed.has(tag) || contextTags.includes(tag)) throw new Error('INVALID_OBSERVATION_CAPTION');
    contextTags.push(tag);
  }
  return { question: question || null, contextTags };
}

/**
 * Correct one observation's optional question and context tags.
 * Media, the cat, reactions, inference, and every other record stay.
 * Stored conversation text is left untouched. This does not analyze the photo, cry, or video.
 */
export async function updateDemoObservationCaption(id: string, input: UpdateDemoObservationCaptionInput): Promise<DemoObservation> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    const index = data.observations.findIndex(item => item.id === id);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.observations[index];
    const normalized = normalizeCaption(input, current.contextTags);
    const updated: DemoObservation = { ...current, question: normalized.question, contextTags: normalized.contextTags };
    data.observations[index] = updated;
    return updated;
  });
}

/**
 * Remove one photo, cry, or video observation.
 * Reactions saved on that observation go with it. Nothing is inserted in its place.
 * The cat, other observations, care check-ins, and saved questions stay.
 * Stored conversation text is left untouched. A missing row is already gone.
 */
export async function deleteDemoObservation(id: string): Promise<RemovedDemoObservation | null> {
  return changeDemo(data => {
    const existing = data.observations.find(item => item.id === id);
    if (!existing) return null;
    data.observations = data.observations.filter(item => item.id !== id);
    data.feedback = data.feedback.filter(item => item.observationId !== id);
    return { localPhotoUri: existing.localPhotoUri, localAudioUri: existing.localAudioUri, localVideoUri: existing.localVideoUri };
  });
}

export type UpdateDemoObservationMediaInput = {
  uri: string;
  kind: 'PHOTO' | 'AUDIO' | 'VIDEO';
  durationMs?: number;
  mimeType?: string;
  byteSize?: number;
};

export type ReplacedDemoObservationMedia = {
  previous: RemovedDemoObservation;
  observation: DemoObservation;
};

function assertMediaDuration(kind: 'PHOTO' | 'AUDIO' | 'VIDEO', durationMs: number | undefined) {
  if (kind === 'VIDEO' && (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 11_000)) throw new Error('VIDEO_TOO_LONG');
  if (kind === 'AUDIO' && (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 46_000)) throw new Error('AUDIO_TOO_LONG');
}

function normalizeMedia(input: UpdateDemoObservationMediaInput) {
  if (typeof input.uri !== 'string' || !input.uri.trim()) throw new Error('INVALID_OBSERVATION_MEDIA');
  if (input.kind !== 'PHOTO' && input.kind !== 'AUDIO' && input.kind !== 'VIDEO') throw new Error('INVALID_OBSERVATION_MEDIA');
  assertMediaDuration(input.kind, input.durationMs);
  const mimeType = typeof input.mimeType === 'string' && input.mimeType.trim() ? input.mimeType.trim() : undefined;
  const byteSize = typeof input.byteSize === 'number' && Number.isFinite(input.byteSize) && input.byteSize > 0 ? input.byteSize : undefined;
  return { uri: input.uri.trim(), kind: input.kind, durationMs: input.durationMs, mimeType, byteSize };
}

/**
 * Replace only the photo, cry, or video file on one observation.
 * The observation id, question, context tags, reactions, inference, and every other record stay.
 * Kind cannot change. This does not analyze the new file or invent a server upload.
 */
export async function updateDemoObservationMedia(id: string, input: UpdateDemoObservationMediaInput): Promise<ReplacedDemoObservationMedia> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    const index = data.observations.findIndex(item => item.id === id);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.observations[index];
    const normalized = normalizeMedia(input);
    if (current.kind !== normalized.kind) throw new Error('INVALID_OBSERVATION_MEDIA');
    const previous: RemovedDemoObservation = {
      localPhotoUri: current.localPhotoUri,
      localAudioUri: current.localAudioUri,
      localVideoUri: current.localVideoUri,
    };
    const updated: DemoObservation = { ...current };
    if (normalized.kind === 'PHOTO') {
      updated.localPhotoUri = normalized.uri;
      updated.localAudioUri = undefined;
      updated.localVideoUri = undefined;
      updated.media = [];
    } else if (normalized.kind === 'AUDIO') {
      updated.localAudioUri = normalized.uri;
      updated.localPhotoUri = undefined;
      updated.localVideoUri = undefined;
      updated.media = [{
        kind: 'AUDIO',
        mimeType: normalized.mimeType || 'audio/m4a',
        byteSize: normalized.byteSize ?? 0,
        durationMs: normalized.durationMs ?? null,
        url: '',
      }];
    } else {
      updated.localVideoUri = normalized.uri;
      updated.localPhotoUri = undefined;
      updated.localAudioUri = undefined;
      updated.media = [{
        kind: 'VIDEO',
        mimeType: normalized.mimeType || 'video/mp4',
        byteSize: normalized.byteSize ?? 0,
        durationMs: normalized.durationMs ?? null,
        url: '',
      }];
    }
    data.observations[index] = updated;
    return { previous, observation: updated };
  });
}

function normalizeRecordedTime(value: string, now: Date) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_OBSERVATION_TIME');
  const date = new Date(value.trim());
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_OBSERVATION_TIME');
  if (!Number.isFinite(now.getTime()) || date.getTime() > now.getTime()) throw new Error('OBSERVATION_TIME_FUTURE');
  return date.toISOString();
}

/**
 * Correct the recorded time on one photo, cry, or video observation.
 * The same id, media, question, context tags, reactions, and inference stay.
 * Diary and the weekly summary read this time. This does not analyze the file or upload it.
 */
export async function updateDemoObservationTime(id: string, createdAt: string, now = new Date()): Promise<DemoObservation> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    const index = data.observations.findIndex(item => item.id === id);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.observations[index];
    const recordedAt = normalizeRecordedTime(createdAt, now);
    const updated: DemoObservation = { ...current, createdAt: recordedAt };
    data.observations[index] = updated;
    return updated;
  });
}

/**
 * Move one observation onto another cat the caregiver already has.
 * The observation id, media, question, context tags, reactions, and inference stay.
 * Other observations, care, and stored conversation text stay.
 * This does not create a cat, analyze the file, or upload anything.
 */
export async function moveDemoObservation(id: string, petId: string): Promise<DemoObservation> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    if (typeof petId !== 'string' || !petId.trim()) throw new Error('INVALID_OBSERVATION_PET');
    const targetId = petId.trim();
    const index = data.observations.findIndex(item => item.id === id);
    if (index < 0) throw new Error('NOT_FOUND');
    if (!data.pets.some(pet => pet.id === targetId)) throw new Error('NOT_FOUND');
    const current = data.observations[index];
    if (current.petId === targetId) throw new Error('INVALID_OBSERVATION_PET');
    const updated: DemoObservation = { ...current, petId: targetId };
    data.observations[index] = updated;
    return updated;
  });
}

function replaceCitation(ids: readonly string[], index: number, targetId: string) {
  if (!Number.isInteger(index) || index < 0 || index >= ids.length) throw new Error('INVALID_OBSERVATION_CITATION');
  const nextId = typeof targetId === 'string' ? targetId.trim() : '';
  if (!nextId || nextId === ids[index]) throw new Error('INVALID_OBSERVATION_CITATION');
  return ids.map((id, at) => at === index ? nextId : id);
}

/**
 * Point one cited prior reaction at another observation that is already saved.
 * Only that index on this observation's inference changes.
 * The observation id, media, question, context tags, reactions, and the rest of the inference stay.
 * Other citations on this observation stay. Conversations are not retargeted.
 * This does not create an observation, reaction, or cat, and it does not analyze media or rewrite an answer.
 */
export async function retargetDemoObservationCitation(id: string, index: number, observationId: string): Promise<DemoObservation> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    const indexInList = data.observations.findIndex(item => item.id === id);
    if (indexInList < 0) throw new Error('NOT_FOUND');
    const current = data.observations[indexInList];
    const inference = current.inference;
    if (!inference || !Array.isArray(inference.citedObservationIds)) throw new Error('INVALID_OBSERVATION_CITATION');
    const nextIds = replaceCitation(inference.citedObservationIds, index, observationId);
    const targetId = nextIds[index];
    if (!data.observations.some(item => item.id === targetId)) throw new Error('NOT_FOUND');
    const updated: DemoObservation = { ...current, inference: { ...inference, citedObservationIds: nextIds } };
    data.observations[indexInList] = updated;
    return updated;
  });
}
