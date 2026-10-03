import type { CompanionCheckin, CompanionPet, CompanionObservation, CompanionConsent, CompanionFeedback, CompanionInference } from '@findthem/shared';
import { readDemo, writeDemo } from '../../core/storage';

export type FeedbackRecord = CompanionFeedback;
export type ChatReply = { id: string; text: string; citedObservationIds: string[] };
export type DemoObservation = CompanionObservation & { localPhotoUri?: string; localAudioUri?: string; localVideoUri?: string };
export type DemoState = { version: 1; checkins: CompanionCheckin[]; checkinRequests: Record<string, string>; pets: CompanionPet[]; observations: DemoObservation[]; feedback: FeedbackRecord[]; consent: CompanionConsent };
export type DemoMediaDraft = { uri: string; kind: 'PHOTO' | 'AUDIO' | 'VIDEO'; durationMs?: number; mimeType?: string; byteSize?: number; petId: string; question: string; contextTags: string[]; idempotencyKey: string };
export const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export function initialDemo(): DemoState {
  const date = new Date().toISOString();
  return { version: 1, checkins: [], checkinRequests: {}, pets: [{ id: 'demo-momo', name: '모모', species: 'CAT', profilePhotoUrl: null, confirmedTraits: { age: '3살', breed: '모름' }, createdAt: date, updatedAt: date }], observations: [], feedback: [], consent: { serviceStorage: true, researchTraining: false, updatedAt: date } };
}
export function demoInference(observation: CompanionObservation, previous: CompanionObservation[], feedback: FeedbackRecord[]): CompanionInference {
  const knownIds = new Set(previous.filter(item => item.petId === observation.petId && item.id !== observation.id && item.createdAt <= observation.createdAt).map(item => item.id));
  const memory = feedback.filter(item => knownIds.has(item.observationId)).slice(-1)[0];
  const seen = observation.kind === 'VIDEO'
    ? '보호자가 약 10초 영상을 남겼어요. 체험 모드에서는 영상을 분석하지 않아요.'
    : observation.kind === 'AUDIO'
      ? '보호자가 울음 녹음을 남겼어요. 체험 모드에서는 소리를 분석하지 않아요.'
      : '보호자가 사진과 상황을 입력했어요. 체험 모드에서는 사진 속 자세나 소리를 분석하지 않아요.';
  return { id: createId(), observationId: observation.id, status: 'ABSTAINED', utterance: null, confidence: 'low', reason: '체험 모드에서는 AI를 호출하지 않아요.', observation: [seen], possibilities: [{ label: '실제 해석은 아직 없어요', reason: '아래 행동 기록과 기억 흐름을 체험할 수 있어요.' }], limitations: ['체험용 화면이며 실제 AI 분석 결과가 아닙니다.', '기록은 이 기기에만 남아요.', '소리나 영상을 특정 감정으로 번역하지 않아요.'], suggestedAction: '지금 우리 아이가 무엇을 하는지 지켜보고, 해 본 행동과 이후 반응을 남겨 보세요.', citedObservationIds: memory ? [memory.observationId] : [], createdAt: new Date().toISOString() };
}
/** Local demo record only. The media file stays on device; url is never a server upload. */
export function buildDemoObservation(draft: DemoMediaDraft, previous: CompanionObservation[], feedback: FeedbackRecord[], now = new Date()): DemoObservation {
  if (draft.kind === 'VIDEO' && (typeof draft.durationMs !== 'number' || !Number.isFinite(draft.durationMs) || draft.durationMs <= 0 || draft.durationMs > 11_000)) throw new Error('VIDEO_TOO_LONG');
  // Recorder stops at 45s; allow a small timer overrun so a finished take is not rejected.
  if (draft.kind === 'AUDIO' && (typeof draft.durationMs !== 'number' || !Number.isFinite(draft.durationMs) || draft.durationMs <= 0 || draft.durationMs > 46_000)) throw new Error('AUDIO_TOO_LONG');
  const createdAt = now.toISOString();
  const observation: DemoObservation = { id: draft.idempotencyKey, petId: draft.petId, kind: draft.kind, question: draft.question || null, contextTags: draft.contextTags, status: 'ABSTAINED', failureCode: null, createdAt, completedAt: createdAt, media: [], inference: null, feedback: [] };
  if (draft.kind === 'PHOTO') observation.localPhotoUri = draft.uri;
  if (draft.kind === 'AUDIO') {
    observation.localAudioUri = draft.uri;
    observation.media = [{ kind: 'AUDIO', mimeType: draft.mimeType || 'audio/m4a', byteSize: draft.byteSize && draft.byteSize > 0 ? draft.byteSize : 0, durationMs: draft.durationMs ?? null, url: '' }];
  }
  if (draft.kind === 'VIDEO') {
    observation.localVideoUri = draft.uri;
    observation.media = [{ kind: 'VIDEO', mimeType: draft.mimeType || 'video/mp4', byteSize: draft.byteSize && draft.byteSize > 0 ? draft.byteSize : 0, durationMs: draft.durationMs ?? null, url: '' }];
  }
  observation.inference = demoInference(observation, previous, feedback);
  return observation;
}
export function groundedDemoReply(petId: string, observations: CompanionObservation[], feedback: FeedbackRecord[]): ChatReply {
  const allowed = new Set(observations.filter(item => item.petId === petId).map(item => item.id));
  const memory = feedback.filter(item => allowed.has(item.observationId)).slice(-1)[0];
  return { id: createId(), text: memory ? `저장한 보호자 기록을 찾았어요. “${memory.action}” 이후 “${memory.reaction}”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.\n\n체험 모드에서는 질문에 대한 AI 답변 대신 기록 조회만 보여드려요.` : '아직 이 아이의 반응 기록이 없어요. 사진 기록 뒤 해 본 행동과 이후 반응을 남기면 여기서 다시 찾아볼 수 있어요.\n\n체험 모드에서는 AI가 답변하지 않아요.', citedObservationIds: memory ? [memory.observationId] : [] };
}
let state: DemoState | null = null;
let sequence: Promise<unknown> = Promise.resolve();
async function loadState() {
  if (state) return state;
  const raw = await readDemo();
  if (raw) { const parsed = JSON.parse(raw) as DemoState; if (parsed.version !== 1 || !Array.isArray(parsed.pets) || !Array.isArray(parsed.observations) || !Array.isArray(parsed.feedback)) throw new Error('INVALID_LOCAL_DATA'); state = { ...parsed, checkins: parsed.checkins ?? [], checkinRequests: parsed.checkinRequests ?? {} }; }
  else { state = initialDemo(); await writeDemo(JSON.stringify(state)); }
  return state;
}
export async function getDemo() { await sequence; return loadState(); }
export function changeDemo<T>(update: (draft: DemoState) => T): Promise<T> {
  const pending = sequence.then(async () => { const current = await loadState(); const draft = JSON.parse(JSON.stringify(current)) as DemoState; const result = update(draft); await writeDemo(JSON.stringify(draft)); state = draft; return result; });
  sequence = pending.catch(() => undefined);
  return pending;
}

