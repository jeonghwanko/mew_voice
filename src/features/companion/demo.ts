import type { CompanionCheckin, CompanionPet, CompanionObservation, CompanionConsent, CompanionFeedback, CompanionInference } from '@findthem/shared';
import { readDemo, writeDemo } from '../../core/storage';

export type FeedbackRecord = CompanionFeedback;
export type ChatReply = { id: string; text: string; citedObservationIds: string[] };
export type DemoState = { version: 1; checkins: CompanionCheckin[]; checkinRequests: Record<string, string>; pets: CompanionPet[]; observations: (CompanionObservation & { localPhotoUri?: string })[]; feedback: FeedbackRecord[]; consent: CompanionConsent };
export const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export function initialDemo(): DemoState {
  const date = new Date().toISOString();
  return { version: 1, checkins: [], checkinRequests: {}, pets: [{ id: 'demo-momo', name: '모모', species: 'CAT', profilePhotoUrl: null, confirmedTraits: { age: '3살', breed: '모름' }, createdAt: date, updatedAt: date }], observations: [], feedback: [], consent: { serviceStorage: true, researchTraining: false, updatedAt: date } };
}
export function demoInference(observation: CompanionObservation, previous: CompanionObservation[], feedback: FeedbackRecord[]): CompanionInference {
  const knownIds = new Set(previous.filter(item => item.petId === observation.petId && item.id !== observation.id && item.createdAt <= observation.createdAt).map(item => item.id));
  const memory = feedback.filter(item => knownIds.has(item.observationId)).slice(-1)[0];
  return { id: createId(), observationId: observation.id, status: 'ABSTAINED', utterance: null, confidence: 'low', reason: '체험 모드에서는 AI를 호출하지 않아요.', observation: ['보호자가 사진과 상황을 입력했어요. 체험 모드에서는 사진 속 자세나 소리를 분석하지 않아요.'], possibilities: [{ label: '실제 해석은 아직 없어요', reason: '아래 행동 기록과 기억 흐름을 체험할 수 있어요.' }], limitations: ['체험용 화면이며 실제 AI 분석 결과가 아닙니다.'], suggestedAction: '지금 우리 아이가 무엇을 하는지 지켜보고, 해 본 행동과 이후 반응을 남겨 보세요.', citedObservationIds: memory ? [memory.observationId] : [], createdAt: new Date().toISOString() };
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

