import type { CompanionCheckin, CompanionConversation, CompanionInference, CompanionObservation } from '@findthem/shared';
import { changeDemo, getDemo, initialDemo, saveDemoConversation, type FeedbackRecord } from './demo';
import { citedReactionGoneText, observationCitedReactions, presentCitedReactionAnswer, resolveCitedReactionMap } from './daily';
import { deleteDemoObservation } from './observationStore';
import { errorMessage } from '../../lib/api';

jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));

const observation = (id: string, petId = 'demo-momo', kind: CompanionObservation['kind'] = 'PHOTO'): CompanionObservation => ({
  id, petId, createdAt: id === 'obs-2' ? '2026-09-03T00:00:00Z' : '2026-09-01T00:00:00Z', completedAt: '2026-09-01T00:00:00Z', kind,
  question: id === 'obs-2' ? '식후에는 왜 그르릉거릴까요?' : '창가에서 왜 울까요?', contextTags: ['창가에서'], status: 'ABSTAINED', failureCode: null, media: [], inference: null, feedback: [],
});
const reaction = (id: string, observationId: string, createdAt: string): FeedbackRecord => ({ id, observationId, action: '놀아줬어요', reaction: '따라왔어요', note: '메모', happenedAt: createdAt, createdAt });
const inference = (cited: string[]): CompanionInference => ({
  id: 'inf-2', observationId: 'obs-2', status: 'ABSTAINED', utterance: null, confidence: 'low', reason: null,
  observation: ['보호자가 남긴 기록이에요.'], possibilities: [], limitations: [], suggestedAction: null, citedObservationIds: cited, createdAt: '2026-09-03T00:00:00Z',
});
const checkin = (): CompanionCheckin => ({ id: 'care-1', petId: 'demo-momo', kind: 'PLAY', note: '낚싯대로 놀았어요', occurredAt: '2026-09-02T00:00:00Z', version: 1, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' });

beforeEach(async () => { await changeDemo(data => Object.assign(data, initialDemo())); });

it('deletes one observation and its reactions without a stand-in or other records', async () => {
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: ['care-1'], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  const other = observation('obs-2');
  other.question = '식후에는 왜 그르릉거릴까요?';
  other.contextTags = [];
  other.inference = inference(['obs-1']);
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [{ ...observation('obs-1', 'demo-momo', 'AUDIO'), localAudioUri: 'file:///companion-audio/obs-1.m4a' }, other, observation('obs-3', 'demo-nabi', 'VIDEO')];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('older', 'obs-1', '2026-09-01T01:00:00Z'), { ...reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z'), action: '밥을 줬어요', reaction: '먹었어요' }];
    data.checkins = [checkin()];
    data.conversations = [thread];
  });
  const removed = await deleteDemoObservation('obs-1');
  const state = await getDemo();
  expect(removed?.localAudioUri).toBe('file:///companion-audio/obs-1.m4a');
  expect(state.observations.map(item => item.id)).toEqual(['obs-2', 'obs-3']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-2']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.conversations).toHaveLength(1);
  expect(state.conversations[0].question).toBe('창가에서 왜 울까요?');
  expect(state.conversations[0].answer).toBe(saved);
  expect(state.conversations[0].citedObservationIds).toEqual(['obs-1']);
  expect(state.observations.find(item => item.id === 'obs-2')?.inference?.citedObservationIds).toEqual(['obs-1']);
  const moments = resolveCitedReactionMap({
    ids: ['obs-1'],
    known: new Map(),
    loadedIds: new Set(state.observations.map(item => item.id)),
    listComplete: true,
    extra: [],
  });
  expect(moments.get('obs-1')).toEqual({ status: 'gone' });
  const shown = presentCitedReactionAnswer(state.conversations[0].answer, moments.get('obs-1'));
  expect(shown).toContain(citedReactionGoneText);
  expect(shown).not.toContain('놀아줬어요');
  expect(shown).not.toContain('따라왔어요');
  expect(observationCitedReactions(['obs-1'], moments)).toEqual([{ id: 'obs-1', line: citedReactionGoneText, open: false }]);
  const again = await saveDemoConversation('demo-momo', '창가에서 왜 울까요?', 'thread-2', new Date('2026-09-04T00:00:00Z'));
  expect(again.citedObservationIds).not.toContain('obs-1');
  expect(again.answer).not.toContain('따라왔어요');
  expect((await getDemo()).conversations.find(item => item.id === 'thread-1')?.question).toBe('창가에서 왜 울까요?');
  await expect(deleteDemoObservation('obs-1')).resolves.toBeNull();
  expect((await getDemo()).observations.map(item => item.id)).toEqual(['obs-2', 'obs-3']);
});

it('still deletes after storage consent is withdrawn and does not invent an account delete', async () => {
  await changeDemo(data => {
    data.consent.serviceStorage = false;
    data.observations = [observation('photo-1', 'demo-momo', 'PHOTO')];
    data.feedback = [reaction('only', 'photo-1', '2026-09-01T00:00:00Z')];
  });
  await expect(deleteDemoObservation('photo-1')).resolves.toEqual({ localPhotoUri: undefined, localAudioUri: undefined, localVideoUri: undefined });
  const state = await getDemo();
  expect(state.observations).toEqual([]);
  expect(state.feedback).toEqual([]);
  expect(errorMessage(new Error('OBSERVATION_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 관찰은 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.');
});
