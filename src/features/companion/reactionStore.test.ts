import type { CompanionConversation, CompanionObservation } from '@findthem/shared';
import { changeDemo, getDemo, initialDemo, saveDemoConversation, type FeedbackRecord } from './demo';
import { citedReactionFromFeedback, presentCitedReactionAnswer } from './daily';
import { deleteDemoFeedback, feedbackVersion, updateDemoFeedback } from './reactionStore';

jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));

const observation = (id: string): CompanionObservation => ({ id, petId: 'demo-momo', createdAt: '2026-09-01T00:00:00Z', completedAt: '2026-09-01T00:00:00Z', kind: 'PHOTO', question: '창가에서 왜 울까요?', contextTags: ['창가에서'], status: 'ABSTAINED', failureCode: null, media: [], inference: null, feedback: [] });
const reaction = (id: string, observationId: string, createdAt: string, action = '놀아줬어요', response = '따라왔어요'): FeedbackRecord => ({ id, observationId, action, reaction: response, note: '메모', happenedAt: createdAt, createdAt });

beforeEach(async () => { await changeDemo(data => Object.assign(data, initialDemo())); });

it('replaces the latest reaction in place and leaves the stored answer alone', async () => {
  const saved = '질문과 같은 문구의 이전 기록은 찾지 못해서, 가장 최근에 저장한 반응만 보여 드려요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: [], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  await changeDemo(data => { data.observations = [observation('obs-1')]; data.feedback = [reaction('older', 'obs-1', '2026-09-01T00:00:00Z', '지켜봤어요', '그대로였어요'), reaction('latest', 'obs-1', '2026-09-02T00:00:00Z')]; data.conversations = [thread]; });
  const updated = await updateDemoFeedback('obs-1', 'latest', { version: 1, action: '창문을 열었어요', reaction: '다가왔어요', note: '  바람만 들었어요  ' });
  const state = await getDemo();
  expect(updated.id).toBe('latest');
  expect(updated.version).toBe(2);
  expect(updated.happenedAt).toBe('2026-09-02T00:00:00Z');
  expect(updated.createdAt).toBe('2026-09-02T00:00:00Z');
  expect(state.feedback.map(item => item.id)).toEqual(['older', 'latest']);
  expect(state.feedback.find(item => item.id === 'latest')).toMatchObject({ action: '창문을 열었어요', reaction: '다가왔어요', note: '바람만 들었어요', version: 2 });
  expect(state.feedback.find(item => item.id === 'older')?.action).toBe('지켜봤어요');
  expect(state.conversations[0].answer).toBe(saved);
  expect(state.observations[0].inference).toBeNull();
  const current = citedReactionFromFeedback(state.feedback.filter(item => item.observationId === 'obs-1'));
  expect(current).toEqual({ status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' });
  expect(presentCitedReactionAnswer(state.conversations[0].answer, current)).toContain('“창문을 열었어요” 이후 “다가왔어요”라고 남겼어요');
  expect(presentCitedReactionAnswer(state.conversations[0].answer, current)).not.toContain('따라왔어요');
  await expect(updateDemoFeedback('obs-1', 'latest', { version: 1, action: '이전 기기', reaction: '그대로예요' })).rejects.toThrow('EDIT_CONFLICT');
  await expect(updateDemoFeedback('obs-1', 'older', { version: 1, action: '밥을 줬어요', reaction: '먹었어요' })).rejects.toThrow('EDIT_CONFLICT');
});

it('deletes the latest reaction without inventing a replacement', async () => {
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  await changeDemo(data => {
    data.observations = [observation('obs-1')];
    data.feedback = [reaction('older', 'obs-1', '2026-09-01T00:00:00Z', '지켜봤어요', '그대로였어요'), reaction('latest', 'obs-1', '2026-09-02T00:00:00Z')];
    data.conversations = [{ id: 'thread-1', petId: 'demo-momo', question: '창가', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: [], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' }];
  });
  await deleteDemoFeedback('obs-1', 'latest', 1);
  const state = await getDemo();
  expect(state.feedback.map(item => item.id)).toEqual(['older']);
  expect(state.conversations[0].answer).toBe(saved);
  expect(citedReactionFromFeedback(state.feedback.filter(item => item.observationId === 'obs-1'))).toEqual({ status: 'saved', action: '지켜봤어요', reaction: '그대로였어요' });
  await deleteDemoFeedback('obs-1', 'older', 1);
  const gone = await getDemo();
  expect(gone.feedback).toEqual([]);
  expect(gone.conversations[0].answer).toBe(saved);
  expect(citedReactionFromFeedback(gone.feedback.filter(item => item.observationId === 'obs-1'))).toEqual({ status: 'gone' });
  await expect(deleteDemoFeedback('obs-1', 'older', 1)).resolves.toBeUndefined();
});

it('does not revive a deleted reaction or edit across observations', async () => {
  await changeDemo(data => { data.observations = [observation('obs-1'), observation('obs-2')]; data.feedback = [reaction('only', 'obs-1', '2026-09-01T00:00:00Z')]; });
  await deleteDemoFeedback('obs-1', 'only', 1);
  await expect(updateDemoFeedback('obs-1', 'only', { version: 1, action: '놀아줬어요', reaction: '따라왔어요' })).rejects.toThrow('NOT_FOUND');
  expect((await getDemo()).feedback).toEqual([]);
  await changeDemo(data => { data.feedback = [reaction('one', 'obs-1', '2026-09-01T00:00:00Z'), reaction('two', 'obs-2', '2026-09-03T00:00:00Z', '밥을 줬어요', '먹었어요')]; });
  await updateDemoFeedback('obs-2', 'two', { version: 1, action: '물을 줬어요', reaction: '마셨어요', note: null });
  expect((await getDemo()).feedback.find(item => item.id === 'one')).toMatchObject({ action: '놀아줬어요', reaction: '따라왔어요' });
  await expect(updateDemoFeedback('missing', 'two', { version: 2, action: '물을 줬어요', reaction: '마셨어요' })).rejects.toThrow('NOT_FOUND');
});

it('requires consent to edit, still allows delete after withdrawal, and rejects a blank pair', async () => {
  await changeDemo(data => { data.observations = [observation('obs-1')]; data.feedback = [reaction('only', 'obs-1', '2026-09-01T00:00:00Z')]; data.consent.serviceStorage = false; });
  await expect(updateDemoFeedback('obs-1', 'only', { version: 1, action: '창문을 열었어요', reaction: '다가왔어요' })).rejects.toThrow('CONSENT_REQUIRED');
  await expect(deleteDemoFeedback('obs-1', 'only', 1)).resolves.toBeUndefined();
  await changeDemo(data => { data.consent.serviceStorage = true; data.feedback = [reaction('only', 'obs-1', '2026-09-01T00:00:00Z')]; });
  await expect(updateDemoFeedback('obs-1', 'only', { version: 1, action: ' ', reaction: '다가왔어요' })).rejects.toThrow('INVALID_FEEDBACK');
  await expect(updateDemoFeedback('obs-1', 'only', { version: 1, action: '놀아줬어요', reaction: ' ' })).rejects.toThrow('INVALID_FEEDBACK');
  expect((await getDemo()).feedback).toHaveLength(1);
  expect(feedbackVersion({})).toBe(1);
  expect(feedbackVersion({ version: 2 })).toBe(2);
});

it('keeps a new answer on the edited reaction while the old saved answer stays on disk', async () => {
  await changeDemo(data => { data.observations = [observation('obs-1')]; data.feedback = [reaction('latest', 'obs-1', '2026-09-02T00:00:00Z')]; });
  const before = await saveDemoConversation('demo-momo', '창가에서 왜 울까요?', 'thread-1', new Date('2026-09-03T00:00:00Z'));
  expect(before.answer).toContain('따라왔어요');
  await updateDemoFeedback('obs-1', 'latest', { version: 1, action: '창문을 열었어요', reaction: '다가왔어요' });
  const disk = (await getDemo()).conversations.find(item => item.id === 'thread-1');
  expect(disk?.answer).toBe(before.answer);
  const again = await saveDemoConversation('demo-momo', '창가에서 왜 울까요?', 'thread-2', new Date('2026-09-04T00:00:00Z'));
  expect(again.answer).toContain('다가왔어요');
  expect(again.answer).not.toContain('따라왔어요');
  expect((await getDemo()).conversations.find(item => item.id === 'thread-1')?.answer).toBe(before.answer);
});
