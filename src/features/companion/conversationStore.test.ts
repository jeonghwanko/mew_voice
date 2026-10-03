import type { CompanionCheckin, CompanionConversation, CompanionObservation } from '@findthem/shared';
import { changeDemo, getDemo, initialDemo, type FeedbackRecord } from './demo';
import { conversationOpenPet, deleteDemoConversation, findDemoConversation, moveDemoConversation, updateDemoConversationQuestion } from './conversationStore';
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

it('moves one saved conversation to another existing cat and keeps the id, turns, and citations', async () => {
  const answer = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const kept = turn('thread-keep', 'demo-momo', '나중에 남긴 질문', '2026-09-03T00:00:00Z');
  const moved = turn('thread-wrong', 'demo-momo', '잘못 저장한 질문', '2026-09-02T00:00:00Z');
  moved.answer = answer;
  const other = turn('thread-other', 'demo-nabi', '다른 아이 질문', '2026-09-02T12:00:00Z');
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [observation('obs-1'), observation('obs-2', 'demo-nabi')];
    data.feedback = [reaction('on-1', 'obs-1')];
    data.checkins = [checkin()];
    data.conversations = [kept, moved, other];
  });
  const result = await moveDemoConversation('thread-wrong', '  demo-nabi  ');
  const state = await getDemo();
  const stored = await findDemoConversation('thread-wrong');
  expect(result).toEqual({ ...moved, petId: 'demo-nabi' });
  expect(stored).toEqual({ ...moved, petId: 'demo-nabi' });
  expect(stored?.answer).toBe(answer);
  expect(state.conversations.find(item => item.id === 'thread-wrong')).toEqual(stored);
  expect(state.conversations.filter(item => item.petId === 'demo-momo').map(item => item.id)).toEqual(['thread-keep']);
  expect(state.conversations.filter(item => item.petId === 'demo-nabi').map(item => item.id).sort()).toEqual(['thread-other', 'thread-wrong']);
  expect(homeConversationThread(state.conversations, 'demo-nabi').map(item => item.id)).toEqual(['thread-wrong', 'thread-other']);
  expect(homeConversationThread(state.conversations, 'demo-momo').map(item => item.id)).toEqual(['thread-keep']);
  expect(diaryConversationRows(state.conversations, 'demo-nabi').map(item => item.id)).toEqual(['conversation-thread-wrong', 'conversation-thread-other']);
  expect(diaryConversationRows(state.conversations, 'demo-momo').map(item => item.id)).toEqual(['conversation-thread-keep']);
  expect(diaryConversationRows(state.conversations, 'demo-nabi').find(item => item.id === 'conversation-thread-wrong')?.target).toBe('/(tabs)/conversation?conversationId=thread-wrong');
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-1']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  expect(state.conversations.find(item => item.id === 'thread-keep')).toEqual(kept);
  expect(state.conversations.find(item => item.id === 'thread-other')).toEqual(other);
  expect(conversationOpenPet({ conversationPetId: stored?.petId, requestedPetId: 'demo-momo', knownPetIds: state.pets.map(item => item.id) })).toBe('demo-nabi');
  await deleteDemoConversation('thread-wrong');
  expect(await findDemoConversation('thread-wrong')).toBeNull();
  expect((await getDemo()).conversations.map(item => item.id).sort()).toEqual(['thread-keep', 'thread-other']);
});

it('rejects a conversation move to the same cat, a missing cat, or an account and does not invent a pet', async () => {
  const saved = turn('thread-wrong', 'demo-momo', '잘못 저장한 질문', '2026-09-02T00:00:00Z');
  await changeDemo(data => { data.conversations = [saved]; });
  await expect(moveDemoConversation('thread-wrong', 'demo-momo')).rejects.toThrow('INVALID_CONVERSATION_PET');
  await expect(moveDemoConversation('thread-wrong', '   ')).rejects.toThrow('INVALID_CONVERSATION_PET');
  await expect(moveDemoConversation('thread-wrong', 'demo-made-up')).rejects.toThrow('NOT_FOUND');
  await expect(moveDemoConversation('missing', 'demo-momo')).rejects.toThrow('NOT_FOUND');
  const before = await getDemo();
  expect(before.pets.map(item => item.id)).toEqual(['demo-momo']);
  expect(before.conversations).toEqual([saved]);
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(moveDemoConversation('thread-wrong', 'demo-nabi')).rejects.toThrow('CONSENT_REQUIRED');
  const state = await getDemo();
  expect(state.pets).toEqual(before.pets);
  expect(state.conversations).toEqual([saved]);
  expect(await findDemoConversation('thread-wrong')).toEqual(saved);
  expect(await findDemoConversation('   ')).toBeNull();
  expect(conversationOpenPet({ conversationPetId: 'demo-made-up', requestedPetId: 'demo-momo', knownPetIds: ['demo-momo'] })).toBe('demo-momo');
  expect(conversationOpenPet({ conversationPetId: null, requestedPetId: '  ', knownPetIds: ['demo-momo'] })).toBeNull();
  expect(conversationOpenPet({ conversationPetId: 'demo-nabi', requestedPetId: 'demo-momo', knownPetIds: [] })).toBeNull();
  expect(errorMessage(new Error('INVALID_CONVERSATION_PET'))).toBe('옮길 아이를 확인해 주세요.');
  expect(errorMessage(new Error('CONVERSATION_PET_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 대화는 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});

it('rewrites one saved question in place and keeps the id, answer, and citations', async () => {
  const answer = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const kept = turn('thread-keep', 'demo-momo', '나중에 남긴 질문', '2026-09-03T00:00:00Z');
  const edited = turn('thread-wrong', 'demo-momo', '잘못 저장한 질문', '2026-09-02T00:00:00Z');
  edited.answer = answer;
  const other = turn('thread-other', 'demo-nabi', '다른 아이 질문', '2026-09-02T12:00:00Z');
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [observation('obs-1'), observation('obs-2', 'demo-nabi')];
    data.feedback = [reaction('on-1', 'obs-1')];
    data.checkins = [checkin()];
    data.conversations = [kept, edited, other];
  });
  const before = await getDemo();
  const result = await updateDemoConversationQuestion('thread-wrong', '  창가에서 왜 울었는지 다시 적어요  ');
  const state = await getDemo();
  const stored = await findDemoConversation('thread-wrong');
  expect(result).toEqual({ ...edited, question: '창가에서 왜 울었는지 다시 적어요' });
  expect(stored).toEqual(result);
  expect(stored?.id).toBe('thread-wrong');
  expect(stored?.answer).toBe(answer);
  expect(stored?.citedObservationIds).toEqual(['obs-1']);
  expect(stored?.citedCheckinIds).toEqual(['care-1']);
  expect(stored?.petId).toBe('demo-momo');
  expect(stored?.status).toBe('COMPLETED');
  expect(stored?.createdAt).toBe(edited.createdAt);
  expect(state.conversations).toHaveLength(before.conversations.length);
  expect(state.conversations.map(item => item.id)).toEqual(['thread-keep', 'thread-wrong', 'thread-other']);
  expect(state.conversations.find(item => item.id === 'thread-keep')).toEqual(kept);
  expect(state.conversations.find(item => item.id === 'thread-other')).toEqual(other);
  expect(homeConversationThread(state.conversations, 'demo-momo').map(item => item.id)).toEqual(['thread-wrong', 'thread-keep']);
  expect(homeConversationThread(state.conversations, 'demo-momo').find(item => item.id === 'thread-wrong')?.question).toBe('창가에서 왜 울었는지 다시 적어요');
  expect(homeConversationThread(state.conversations, 'demo-momo').find(item => item.id === 'thread-wrong')?.answer).toBe(answer);
  expect(diaryConversationRows(state.conversations, 'demo-momo').find(item => item.id === 'conversation-thread-wrong')).toMatchObject({
    label: '창가에서 왜 울었는지 다시 적어요',
    note: answer,
    target: '/(tabs)/conversation?conversationId=thread-wrong',
  });
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-1']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  await expect(updateDemoConversationQuestion('thread-wrong', '   ')).rejects.toThrow('INVALID_CONVERSATION_QUESTION');
  await expect(updateDemoConversationQuestion('thread-wrong', '가'.repeat(1501))).rejects.toThrow('INVALID_CONVERSATION_QUESTION');
  await expect(updateDemoConversationQuestion('missing', '다시 적은 질문')).rejects.toThrow('NOT_FOUND');
  const afterReject = await getDemo();
  expect(afterReject.conversations.find(item => item.id === 'thread-wrong')?.question).toBe('창가에서 왜 울었는지 다시 적어요');
  expect(afterReject.conversations.find(item => item.id === 'thread-wrong')?.answer).toBe(answer);
  expect(afterReject.conversations).toHaveLength(3);
  expect(afterReject.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(updateDemoConversationQuestion('thread-wrong', '동의 없는 수정')).rejects.toThrow('CONSENT_REQUIRED');
  const frozen = await findDemoConversation('thread-wrong');
  expect(frozen?.question).toBe('창가에서 왜 울었는지 다시 적어요');
  expect(frozen?.answer).toBe(answer);
  expect(errorMessage(new Error('INVALID_CONVERSATION_QUESTION'))).toBe('질문 문장을 확인해 주세요.');
  expect(errorMessage(new Error('CONVERSATION_QUESTION_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 대화의 질문은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});
