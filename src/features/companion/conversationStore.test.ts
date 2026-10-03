import type { CompanionCheckin, CompanionConversation, CompanionObservation } from '@findthem/shared';
import { changeDemo, getDemo, initialDemo, type FeedbackRecord } from './demo';
import { deleteDemoConversation } from './conversationStore';
import { diaryConversationRows } from './diaryTimeline';
import { homeConversationThread } from './homeConversation';
import { errorMessage } from '../../lib/api';

jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));

const observation = (id: string, petId = 'demo-momo'): CompanionObservation => ({
  id, petId, createdAt: '2026-09-01T00:00:00Z', completedAt: '2026-09-01T00:00:00Z', kind: 'PHOTO',
  question: '창가에서 왜 울까요?', contextTags: ['창가에서'], status: 'ABSTAINED', failureCode: null, media: [], inference: null, feedback: [],
});
const reaction = (id: string, observationId: string): FeedbackRecord => ({
  id, observationId, action: '놀아줬어요', reaction: '따라왔어요', note: null, happenedAt: '2026-09-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z',
});
const checkin = (): CompanionCheckin => ({
  id: 'care-1', petId: 'demo-momo', kind: 'PLAY', note: '낚싯대로 놀았어요', occurredAt: '2026-09-02T00:00:00Z', version: 1, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z',
});
const turn = (id: string, petId: string, question: string, createdAt: string): CompanionConversation => ({
  id, petId, question, answer: `${question} 답`, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: ['care-1'], createdAt, completedAt: createdAt,
});

beforeEach(async () => { await changeDemo(data => Object.assign(data, initialDemo())); });

it('deletes one saved turn without removing the cat or other records', async () => {
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [observation('obs-1'), observation('obs-2', 'demo-nabi')];
    data.feedback = [reaction('on-1', 'obs-1')];
    data.checkins = [checkin()];
    data.conversations = [
      turn('thread-keep', 'demo-momo', '나중에 남긴 질문', '2026-09-03T00:00:00Z'),
      turn('thread-gone', 'demo-momo', '잘못 저장한 질문', '2026-09-02T00:00:00Z'),
      turn('thread-other', 'demo-nabi', '다른 아이 질문', '2026-09-02T12:00:00Z'),
    ];
  });
  const removed = await deleteDemoConversation('thread-gone');
  const state = await getDemo();
  expect(removed?.question).toBe('잘못 저장한 질문');
  expect(state.conversations.map(item => item.id)).toEqual(['thread-keep', 'thread-other']);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-1']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  expect(homeConversationThread(state.conversations, 'demo-momo').map(item => item.id)).toEqual(['thread-keep']);
  expect(diaryConversationRows(state.conversations, 'demo-momo').map(item => item.id)).toEqual(['conversation-thread-keep']);
  expect(diaryConversationRows(state.conversations, 'demo-momo')[0]?.label).toBe('나중에 남긴 질문');
  await expect(deleteDemoConversation('thread-gone')).resolves.toBeNull();
  expect((await getDemo()).conversations.map(item => item.id)).toEqual(['thread-keep', 'thread-other']);
});

it('does not invent an account delete', async () => {
  await changeDemo(data => {
    data.conversations = [turn('acct-1', 'demo-momo', '계정 질문', '2026-09-02T00:00:00Z')];
  });
  expect(errorMessage(new Error('CONVERSATION_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 대화는 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.');
  expect((await getDemo()).conversations).toHaveLength(1);
});
