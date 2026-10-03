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
