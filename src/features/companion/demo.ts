import type { CompanionCheckin, CompanionConversation, CompanionPet, CompanionObservation, CompanionConsent, CompanionFeedback, CompanionInference } from '@findthem/shared';
import { readDemo, writeDemo } from '../../core/storage';
import { checkinLabels, citedCareName } from './daily';

export type FeedbackRecord = CompanionFeedback;
export type ChatReply = { id: string; text: string; citedObservationIds: string[]; citedCheckinIds: string[] };
export type DemoObservation = CompanionObservation & { localPhotoUri?: string; localAudioUri?: string; localVideoUri?: string };
export type DemoState = { version: 1; checkins: CompanionCheckin[]; checkinRequests: Record<string, string>; pets: CompanionPet[]; observations: DemoObservation[]; feedback: FeedbackRecord[]; conversations: CompanionConversation[]; consent: CompanionConsent };
export type DemoMediaDraft = { uri: string; kind: 'PHOTO' | 'AUDIO' | 'VIDEO'; durationMs?: number; mimeType?: string; byteSize?: number; petId: string; question: string; contextTags: string[]; idempotencyKey: string };
export const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export function initialDemo(): DemoState {
  const date = new Date().toISOString();
  return { version: 1, checkins: [], checkinRequests: {}, pets: [{ id: 'demo-momo', name: '모모', species: 'CAT', profilePhotoUrl: null, confirmedTraits: { age: '3살', breed: '모름' }, createdAt: date, updatedAt: date }], observations: [], feedback: [], conversations: [], consent: { serviceStorage: true, researchTraining: false, updatedAt: date } };
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
const DEMO_QUESTION_STOPWORDS = new Set(['오늘', '어제', '내일', '이유', '궁금', '우리', '아이', '기록', '반응', '왜', '어떻게', '무엇', '뭐야', '뭐예요', '했어', '했어요', '인가요', '있어요', '없어요', '같아', '같아요', '어땠나요', '어땠어', '어때', '때', '좀', '더', '그리고', '그래서', '고양이', '냥이', '질문', '답변', '최근', '저장', '보호자', '이후', '이전', '보여줘', '알려줘', '어디', '이거', '그거', '저거', '어떤', '무슨']);
function foldDemoText(value: string) { return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); }
function demoPhrases(parts: (string | null | undefined)[]) {
  const found = new Set<string>();
  for (const part of parts) {
    if (!part?.trim()) continue;
    const whole = foldDemoText(part);
    if (whole.length >= 2 && !DEMO_QUESTION_STOPWORDS.has(whole)) found.add(whole);
    for (const token of part.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (token.length >= 2 && !DEMO_QUESTION_STOPWORDS.has(token)) found.add(token);
    }
  }
  return [...found];
}
function memoryTime(item: FeedbackRecord) { return item.happenedAt || item.createdAt; }
function compareMemory(a: FeedbackRecord, b: FeedbackRecord) { return memoryTime(a).localeCompare(memoryTime(b)) || a.id.localeCompare(b.id); }
function textOverlap(question: string, fields: (string | null | undefined)[]) {
  const foldedQuestion = foldDemoText(question);
  if (foldedQuestion.length < 2) return 0;
  let score = 0;
  for (const phrase of demoPhrases(fields)) if (foldedQuestion.includes(phrase)) score += phrase.length * 2;
  const foldedFields = fields.map(field => foldDemoText(field ?? ''));
  for (const token of demoPhrases([question])) if (foldedFields.some(field => field.includes(token))) score += token.length;
  return score;
}
function memoryScore(question: string, observation: CompanionObservation, item: FeedbackRecord) {
  return textOverlap(question, [observation.question, ...observation.contextTags, item.action, item.reaction, item.note]);
}
function checkinTime(item: CompanionCheckin) { return item.occurredAt || item.createdAt; }
function checkinLabel(item: CompanionCheckin) { return item.kind in checkinLabels ? checkinLabels[item.kind] : '돌봄 기록'; }
type DemoCitation =
  | { source: 'reaction'; at: string; sortId: string; observationId: string; feedback: FeedbackRecord }
  | { source: 'checkin'; at: string; sortId: string; checkin: CompanionCheckin };
function compareCitation(a: DemoCitation, b: DemoCitation) { return a.at.localeCompare(b.at) || a.sortId.localeCompare(b.sortId); }
/** Pick the saved reaction the question actually names. A tie keeps the earlier record, not the newest one. */
export function selectDemoMemory(petId: string, observations: CompanionObservation[], feedback: FeedbackRecord[], question: string) {
  const owned = new Map(observations.filter(item => item.petId === petId).map(item => [item.id, item]));
  const memories = feedback.filter(item => owned.has(item.observationId));
  if (!memories.length) return null;
  let best: { item: FeedbackRecord; score: number } | undefined;
  for (const item of memories) {
    const score = memoryScore(question, owned.get(item.observationId)!, item);
    if (score <= 0) continue;
    if (!best || score > best.score || (score === best.score && compareMemory(item, best.item) < 0)) best = { item, score };
  }
  if (best) return { feedback: best.item, matched: true };
  return { feedback: memories.reduce((latest, item) => compareMemory(item, latest) > 0 ? item : latest), matched: false };
}
/** Saved reactions and care check-ins for this cat only. Text overlap only; a tie keeps the earlier record. */
export function selectDemoCitation(petId: string, observations: CompanionObservation[], feedback: FeedbackRecord[], question: string, checkins: CompanionCheckin[] = []) {
  const owned = new Map(observations.filter(item => item.petId === petId).map(item => [item.id, item]));
  const sources: { item: DemoCitation; fields: (string | null | undefined)[] }[] = [];
  for (const item of feedback) {
    const observation = owned.get(item.observationId);
    if (!observation) continue;
    sources.push({ item: { source: 'reaction', at: memoryTime(item), sortId: item.id, observationId: item.observationId, feedback: item }, fields: [observation.question, ...observation.contextTags, item.action, item.reaction, item.note] });
  }
  for (const item of checkins) {
    if (item.petId !== petId) continue;
    sources.push({ item: { source: 'checkin', at: checkinTime(item), sortId: item.id, checkin: item }, fields: [checkinLabel(item), item.note] });
  }
  if (!sources.length) return null;
  let best: { item: DemoCitation; score: number } | undefined;
  for (const source of sources) {
    const score = textOverlap(question, source.fields);
    if (score <= 0) continue;
    if (!best || score > best.score || (score === best.score && compareCitation(source.item, best.item) < 0)) best = { item: source.item, score };
  }
  if (best) return { citation: best.item, matched: true };
  return { citation: sources.reduce((latest, source) => compareCitation(source.item, latest.item) > 0 ? source : latest).item, matched: false };
}
function checkinQuote(item: CompanionCheckin) {
  const label = checkinLabel(item);
  const note = item.note?.trim();
  if (note && note !== label) return `“${label}”라고 골랐고, “${note}”라고 적었어요`;
  return `“${label}”라고 남겼어요`;
}
function demoReplyText(citation: DemoCitation | undefined, matched: boolean, now = new Date()) {
  if (!citation) return '아직 이 아이의 반응 기록이나 오늘 돌봄 기록이 없어요. 사진이나 울음 기록 뒤 해 본 행동과 이후 반응, 또는 오늘 돌봄을 남기면 여기서 다시 찾아볼 수 있어요.\n\n체험 모드에서는 AI가 답변하지 않아요.';
  if (citation.source === 'reaction') {
    const lead = matched ? '질문과 맞는 저장 기록을 찾았어요.' : '질문과 같은 문구의 이전 기록은 찾지 못해서, 가장 최근에 저장한 반응만 보여 드려요.';
    return `${lead} “${citation.feedback.action}” 이후 “${citation.feedback.reaction}”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.\n\n이 답은 저장된 보호자 기록을 보여 주는 것이며, 실제 AI 분석이 아니에요. 고양이의 말을 번역한 것도 아니에요.`;
  }
  const lead = matched ? '질문과 맞는 저장 기록을 찾았어요.' : '질문과 같은 문구의 이전 기록은 찾지 못해서, 가장 최근에 저장한 돌봄 기록만 보여 드려요.';
  const care = citedCareName(checkinTime(citation.checkin), now);
  return `${lead} ${care}에 ${checkinQuote(citation.checkin)}. 한 번의 기록으로 이유를 확정할 수는 없어요.\n\n이 답은 저장된 보호자 기록을 보여 주는 것이며, 실제 AI 분석이 아니에요. 고양이의 말을 번역한 것도 아니에요.`;
}
export function groundedDemoReply(petId: string, observations: CompanionObservation[], feedback: FeedbackRecord[], question = '', checkins: CompanionCheckin[] = [], now = new Date()): ChatReply {
  const chosen = selectDemoCitation(petId, observations, feedback, question, checkins);
  const citation = chosen?.citation;
  return {
    id: createId(),
    text: demoReplyText(citation, chosen?.matched ?? false, now),
    citedObservationIds: citation?.source === 'reaction' ? [citation.observationId] : [],
    citedCheckinIds: citation?.source === 'checkin' ? [citation.checkin.id] : [],
  };
}
export function demoConversationsFor(data: DemoState, petId: string) {
  return data.conversations.filter(item => item.petId === petId).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
export function saveDemoConversation(petId: string, question: string, id: string, now = new Date()) {
  const text = question.trim();
  if (!petId || !text || !id.trim()) throw new Error('INVALID_CONVERSATION');
  return changeDemo(data => {
    const existing = data.conversations.find(item => item.id === id);
    if (existing) { if (existing.petId !== petId || existing.question !== text) throw new Error('IDEMPOTENCY_CONFLICT'); return existing; }
    const reply = groundedDemoReply(petId, data.observations, data.feedback, text, data.checkins, now);
    const createdAt = now.toISOString();
    const conversation: CompanionConversation = { id, petId, question: text, answer: reply.text, status: 'COMPLETED', citedObservationIds: reply.citedObservationIds, citedCheckinIds: reply.citedCheckinIds, createdAt, completedAt: createdAt };
    data.conversations.push(conversation);
    return conversation;
  });
}
let state: DemoState | null = null;
let sequence: Promise<unknown> = Promise.resolve();
export function demoFromStorage(raw: string): DemoState {
  const parsed = JSON.parse(raw) as DemoState;
  if (parsed.version !== 1 || !Array.isArray(parsed.pets) || !Array.isArray(parsed.observations) || !Array.isArray(parsed.feedback)) throw new Error('INVALID_LOCAL_DATA');
  if (parsed.conversations != null && !Array.isArray(parsed.conversations)) throw new Error('INVALID_LOCAL_DATA');
  const conversations = (parsed.conversations ?? []).map(item => ({ ...item, citedObservationIds: Array.isArray(item.citedObservationIds) ? item.citedObservationIds : [], citedCheckinIds: Array.isArray(item.citedCheckinIds) ? item.citedCheckinIds : [] }));
  return { ...parsed, checkins: parsed.checkins ?? [], checkinRequests: parsed.checkinRequests ?? {}, conversations };
}
/** Drops the process cache so the next read comes from the on-device demo file. */
export function clearDemoMemory() { state = null; }
async function loadState() {
  if (state) return state;
  const raw = await readDemo();
  if (raw) state = demoFromStorage(raw);
  else { state = initialDemo(); await writeDemo(JSON.stringify(state)); }
  return state;
}
export async function getDemo() { await sequence; return loadState(); }
export function changeDemo<T>(update: (draft: DemoState) => T): Promise<T> {
  const pending = sequence.then(async () => { const current = await loadState(); const draft = JSON.parse(JSON.stringify(current)) as DemoState; const result = update(draft); await writeDemo(JSON.stringify(draft)); state = draft; return result; });
  sequence = pending.catch(() => undefined);
  return pending;
}

