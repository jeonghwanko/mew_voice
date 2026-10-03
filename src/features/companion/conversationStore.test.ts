import type { CompanionCheckin, CompanionConversation, CompanionObservation } from '@findthem/shared';
import { changeDemo, getDemo, initialDemo, type FeedbackRecord } from './demo';
import { conversationOpenPet, deleteDemoConversation, findDemoConversation, moveDemoConversation, retargetDemoConversationCheckin, retargetDemoConversationObservation, updateDemoConversationAnswer, updateDemoConversationQuestion, updateDemoConversationTime } from './conversationStore';
import { citedCareGoneText, citedCaresForAnswer, citedReactionFromFeedback, citedReactionGoneText, citedReactionsForAnswer, dayKey, presentConversationAnswer, resolveCitedReactionMap, type CitedCareRecord } from './daily';
import { diaryConversationRows } from './diaryTimeline';
import { homeConversationThread } from './homeConversation';
import { summarizeWeek } from './weeklySummary';
import { errorMessage } from '../../lib/api';
import { deleteDemoCheckin } from './checkinStore';
import { deleteDemoObservation } from './observationStore';

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

it('rewrites one saved answer in place and keeps the id, question, and citations', async () => {
  const now = new Date('2026-09-10T03:00:00Z');
  const answer = '질문과 맞는 저장 기록을 찾았어요. 2026년 9월 2일 돌봄에 “놀아줬어요”라고 골랐고, “낚싯대로 놀았어요”라고 적었어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const editedAnswer = '보호자가 저장한 문장을 다시 적어요. 2026년 9월 2일 돌봄에 “놀아줬어요”라고 골랐고, “낚싯대로 놀았어요”라고 적었어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const kept = turn('thread-keep', 'demo-momo', '나중에 남긴 질문', '2026-09-03T00:00:00Z');
  const edited = turn('thread-wrong', 'demo-momo', '잘못 저장한 질문', '2026-09-02T00:00:00Z');
  edited.answer = answer;
  edited.completedAt = '2026-09-02T00:05:00Z';
  const other = turn('thread-other', 'demo-nabi', '다른 아이 질문', '2026-09-02T12:00:00Z');
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [observation('obs-1'), observation('obs-2', 'demo-nabi')];
    data.feedback = [reaction('on-1', 'obs-1')];
    data.checkins = [checkin()];
    data.conversations = [kept, edited, other];
  });
  const before = await getDemo();
  const result = await updateDemoConversationAnswer('thread-wrong', `  ${editedAnswer}  `);
  const state = await getDemo();
  const stored = await findDemoConversation('thread-wrong');
  expect(result).toEqual({ ...edited, answer: editedAnswer });
  expect(stored).toEqual(result);
  expect(stored?.id).toBe('thread-wrong');
  expect(stored?.question).toBe('잘못 저장한 질문');
  expect(stored?.answer).toBe(editedAnswer);
  expect(stored?.citedObservationIds).toEqual(['obs-1']);
  expect(stored?.citedCheckinIds).toEqual(['care-1']);
  expect(stored?.petId).toBe('demo-momo');
  expect(stored?.status).toBe('COMPLETED');
  expect(stored?.createdAt).toBe(edited.createdAt);
  expect(stored?.completedAt).toBe('2026-09-02T00:05:00Z');
  expect(state.conversations).toHaveLength(before.conversations.length);
  expect(state.conversations.map(item => item.id)).toEqual(['thread-keep', 'thread-wrong', 'thread-other']);
  expect(state.conversations.find(item => item.id === 'thread-keep')).toEqual(kept);
  expect(state.conversations.find(item => item.id === 'thread-other')).toEqual(other);
  expect(homeConversationThread(state.conversations, 'demo-momo').map(item => item.id)).toEqual(['thread-wrong', 'thread-keep']);
  expect(homeConversationThread(state.conversations, 'demo-momo').find(item => item.id === 'thread-wrong')?.question).toBe('잘못 저장한 질문');
  expect(homeConversationThread(state.conversations, 'demo-momo').find(item => item.id === 'thread-wrong')?.answer).toBe(editedAnswer);
  expect(diaryConversationRows(state.conversations, 'demo-momo').find(item => item.id === 'conversation-thread-wrong')).toMatchObject({
    label: '잘못 저장한 질문',
    note: editedAnswer,
    target: '/(tabs)/conversation?conversationId=thread-wrong',
  });
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-1']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  await changeDemo(data => {
    const care = data.checkins.find(item => item.id === 'care-1');
    if (care) care.note = '다른 장난감으로 놀았어요';
    const savedReaction = data.feedback.find(item => item.id === 'on-1');
    if (savedReaction) savedReaction.reaction = '가만히 있었어요';
  });
  const afterRecords = await findDemoConversation('thread-wrong');
  expect(afterRecords?.id).toBe('thread-wrong');
  expect(afterRecords?.answer).toBe(editedAnswer);
  expect(afterRecords?.answer).toContain('낚싯대로 놀았어요');
  expect(afterRecords?.answer).toContain('따라왔어요');
  expect(afterRecords?.citedObservationIds).toEqual(['obs-1']);
  expect(afterRecords?.citedCheckinIds).toEqual(['care-1']);
  expect((await getDemo()).conversations).toHaveLength(3);
  const moments = new Map<string, CitedCareRecord>([
    ['care-1', { status: 'saved', occurredAt: '2026-09-02T00:00:00Z', kind: 'PLAY', note: '다른 장난감으로 놀았어요' }],
  ]);
  const reactions = new Map([['obs-1', { status: 'saved' as const, action: '놀아줬어요', reaction: '가만히 있었어요' }]]);
  const shown = presentConversationAnswer(afterRecords?.answer, citedCaresForAnswer(afterRecords?.citedCheckinIds, moments), citedReactionsForAnswer(afterRecords?.citedObservationIds, reactions), now);
  expect(shown).toContain('보호자가 저장한 문장을 다시 적어요');
  expect(shown).toContain('2026년 9월 2일 돌봄에 “놀아줬어요”라고 골랐고, “다른 장난감으로 놀았어요”라고 적었어요');
  expect(shown).toContain('“놀아줬어요” 이후 “가만히 있었어요”라고 남겼어요');
  expect(shown).not.toContain('낚싯대로 놀았어요');
  expect(shown).not.toContain('따라왔어요');
  await expect(updateDemoConversationAnswer('thread-wrong', '   ')).rejects.toThrow('INVALID_CONVERSATION_ANSWER');
  await expect(updateDemoConversationAnswer('thread-wrong', '가'.repeat(4001))).rejects.toThrow('INVALID_CONVERSATION_ANSWER');
  await expect(updateDemoConversationAnswer('missing', '다시 적은 답')).rejects.toThrow('NOT_FOUND');
  const afterReject = await getDemo();
  expect(afterReject.conversations.find(item => item.id === 'thread-wrong')?.answer).toBe(editedAnswer);
  expect(afterReject.conversations.find(item => item.id === 'thread-wrong')?.question).toBe('잘못 저장한 질문');
  expect(afterReject.conversations.find(item => item.id === 'thread-wrong')?.citedCheckinIds).toEqual(['care-1']);
  expect(afterReject.conversations).toHaveLength(3);
  expect(afterReject.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(updateDemoConversationAnswer('thread-wrong', '동의 없는 수정')).rejects.toThrow('CONSENT_REQUIRED');
  const frozen = await findDemoConversation('thread-wrong');
  expect(frozen?.question).toBe('잘못 저장한 질문');
  expect(frozen?.answer).toBe(editedAnswer);
  expect(frozen?.citedObservationIds).toEqual(['obs-1']);
  expect(frozen?.citedCheckinIds).toEqual(['care-1']);
  expect(errorMessage(new Error('INVALID_CONVERSATION_ANSWER'))).toBe('답변 문장을 확인해 주세요.');
  expect(errorMessage(new Error('CONVERSATION_ANSWER_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 대화의 답변은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});

it('corrects one conversation time in place so the diary follows the new KST day', async () => {
  const now = new Date('2026-10-03T02:00:00.000Z');
  const answer = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const kept = turn('thread-keep', 'demo-momo', '나중에 남긴 질문', '2026-09-03T00:00:00Z');
  const edited = turn('thread-wrong', 'demo-momo', '잘못 저장한 질문', '2026-09-30T14:30:00.000Z');
  edited.answer = answer;
  edited.completedAt = '2026-09-30T14:31:00.000Z';
  const other = turn('thread-other', 'demo-nabi', '다른 아이 질문', '2026-09-02T12:00:00Z');
  const photo = { ...observation('obs-1'), createdAt: '2026-10-02T01:00:00.000Z', completedAt: '2026-10-02T01:00:00.000Z' };
  const care = { ...checkin(), occurredAt: '2026-10-02T02:00:00.000Z' };
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [photo, observation('obs-2', 'demo-nabi')];
    data.feedback = [reaction('on-1', 'obs-1')];
    data.checkins = [care];
    data.conversations = [kept, edited, other];
  });
  const weekBefore = summarizeWeek({ petId: 'demo-momo', now, demo: true, observations: [photo], feedback: [reaction('on-1', 'obs-1')], checkins: [care] });
  expect(dayKey(edited.createdAt)).toBe('2026-09-30');
  const before = await getDemo();
  const result = await updateDemoConversationTime('thread-wrong', '  2026-09-30T15:30:00.000Z  ', now);
  const state = await getDemo();
  const stored = await findDemoConversation('thread-wrong');
  expect(result).toEqual({ ...edited, createdAt: '2026-09-30T15:30:00.000Z' });
  expect(stored).toEqual(result);
  expect(stored?.id).toBe('thread-wrong');
  expect(stored?.question).toBe('잘못 저장한 질문');
  expect(stored?.answer).toBe(answer);
  expect(stored?.citedObservationIds).toEqual(['obs-1']);
  expect(stored?.citedCheckinIds).toEqual(['care-1']);
  expect(stored?.petId).toBe('demo-momo');
  expect(stored?.status).toBe('COMPLETED');
  expect(stored?.completedAt).toBe('2026-09-30T14:31:00.000Z');
  expect(dayKey(stored!.createdAt)).toBe('2026-10-01');
  expect(state.conversations).toHaveLength(before.conversations.length);
  expect(state.conversations.map(item => item.id)).toEqual(['thread-keep', 'thread-wrong', 'thread-other']);
  expect(state.conversations.find(item => item.id === 'thread-keep')).toEqual(kept);
  expect(state.conversations.find(item => item.id === 'thread-other')).toEqual(other);
  expect(homeConversationThread(state.conversations, 'demo-momo').map(item => item.id)).toEqual(['thread-keep', 'thread-wrong']);
  expect(homeConversationThread(state.conversations, 'demo-momo').find(item => item.id === 'thread-wrong')?.answer).toBe(answer);
  const diary = diaryConversationRows(state.conversations, 'demo-momo').find(item => item.id === 'conversation-thread-wrong');
  expect(diary).toMatchObject({
    label: '잘못 저장한 질문',
    note: answer,
    at: '2026-09-30T15:30:00.000Z',
    target: '/(tabs)/conversation?conversationId=thread-wrong',
  });
  expect(dayKey(diary!.at)).toBe('2026-10-01');
  expect(dayKey(diaryConversationRows(state.conversations, 'demo-momo').find(item => item.id === 'conversation-thread-keep')!.at)).toBe('2026-09-03');
  const weekAfter = summarizeWeek({ petId: 'demo-momo', now, demo: true, observations: state.observations.filter(item => item.petId === 'demo-momo'), feedback: state.feedback, checkins: state.checkins });
  expect(weekAfter.observationCount).toBe(weekBefore.observationCount);
  expect(weekAfter.checkinCount).toBe(weekBefore.checkinCount);
  expect(weekAfter.recordCount).toBe(weekBefore.recordCount);
  expect(weekAfter.feedbackCount).toBe(weekBefore.feedbackCount);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-1']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  const same = await updateDemoConversationTime('thread-wrong', now.toISOString(), now);
  expect(same.id).toBe('thread-wrong');
  expect(same.createdAt).toBe(now.toISOString());
  expect(same.answer).toBe(answer);
  expect(await findDemoConversation('thread-wrong')).toMatchObject({ id: 'thread-wrong', question: '잘못 저장한 질문', answer });
});

it('rejects an empty or future conversation time and does not invent an account update', async () => {
  const now = new Date('2026-10-03T02:00:00.000Z');
  const saved = turn('thread-wrong', 'demo-momo', '잘못 저장한 질문', '2026-09-02T00:00:00.000Z');
  saved.answer = '저장된 답';
  await changeDemo(data => { data.conversations = [saved]; });
  await expect(updateDemoConversationTime('thread-wrong', '   ', now)).rejects.toThrow('INVALID_CONVERSATION_TIME');
  await expect(updateDemoConversationTime('thread-wrong', 'not-a-time', now)).rejects.toThrow('INVALID_CONVERSATION_TIME');
  await expect(updateDemoConversationTime('thread-wrong', '2026-10-03T02:00:00.001Z', now)).rejects.toThrow('CONVERSATION_TIME_FUTURE');
  await expect(updateDemoConversationTime('missing', '2026-10-02T00:00:00.000Z', now)).rejects.toThrow('NOT_FOUND');
  const kept = await getDemo();
  expect(kept.conversations).toHaveLength(1);
  expect(kept.conversations[0]).toEqual(saved);
  expect(await findDemoConversation('thread-wrong')).toEqual(saved);
  expect(dayKey(saved.createdAt)).toBe('2026-09-02');
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(updateDemoConversationTime('thread-wrong', '2026-10-01T00:00:00.000Z', now)).rejects.toThrow('CONSENT_REQUIRED');
  expect(await findDemoConversation('thread-wrong')).toEqual(saved);
  expect(errorMessage(new Error('INVALID_CONVERSATION_TIME'))).toBe('대화 시각을 확인해 주세요.');
  expect(errorMessage(new Error('CONVERSATION_TIME_FUTURE'))).toBe('미래 시각은 기록할 수 없어요. 이전 시각을 그대로 두었어요.');
  expect(errorMessage(new Error('CONVERSATION_TIME_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 대화 시각은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});

it('points one cited observation at another saved observation and leaves the other citations', async () => {
  const answer = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. “지켜봤어요” 이후 “그대로였어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const kept = turn('thread-keep', 'demo-momo', '나중에 남긴 질문', '2026-09-03T00:00:00Z');
  const edited = turn('thread-wrong', 'demo-momo', '잘못 가리킨 질문', '2026-09-02T00:00:00Z');
  edited.answer = answer;
  edited.citedObservationIds = ['obs-1', 'obs-3'];
  edited.citedCheckinIds = ['care-1', 'care-2'];
  const other = turn('thread-other', 'demo-nabi', '다른 아이 질문', '2026-09-02T12:00:00Z');
  const inference = { id: 'inf-1', observationId: 'obs-prior', status: 'ABSTAINED' as const, utterance: null, confidence: 'low' as const, reason: '체험 모드에서는 AI를 호출하지 않아요.', observation: ['보호자가 사진과 상황을 입력했어요.'], possibilities: [], limitations: ['체험용 화면이며 실제 AI 분석 결과가 아닙니다.'], suggestedAction: null, citedObservationIds: ['obs-1'], createdAt: '2026-09-01T00:00:00Z' };
  const care2 = { ...checkin(), id: 'care-2', kind: 'MEAL' as const, note: '간식', occurredAt: '2026-09-01T00:00:00Z' };
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [observation('obs-1'), observation('obs-2', 'demo-nabi'), observation('obs-3'), { ...observation('obs-prior'), inference }];
    data.feedback = [reaction('on-1', 'obs-1'), { ...reaction('on-2', 'obs-2'), action: '밥을 줬어요', reaction: '먹었어요' }, { ...reaction('on-3', 'obs-3'), action: '지켜봤어요', reaction: '그대로였어요' }];
    data.checkins = [checkin(), care2];
    data.conversations = [kept, edited, other];
  });
  const before = await getDemo();
  const result = await retargetDemoConversationObservation('thread-wrong', 0, '  obs-2  ');
  const state = await getDemo();
  const stored = await findDemoConversation('thread-wrong');
  expect(result.citedObservationIds).toEqual(['obs-2', 'obs-3']);
  expect(stored).toEqual(result);
  expect(stored?.id).toBe('thread-wrong');
  expect(stored?.question).toBe('잘못 가리킨 질문');
  expect(stored?.answer).toBe(answer);
  expect(stored?.citedCheckinIds).toEqual(['care-1', 'care-2']);
  expect(stored?.petId).toBe('demo-momo');
  expect(state.conversations).toHaveLength(before.conversations.length);
  expect(state.conversations.map(item => item.id)).toEqual(['thread-keep', 'thread-wrong', 'thread-other']);
  expect(state.conversations.find(item => item.id === 'thread-keep')).toEqual(kept);
  expect(state.conversations.find(item => item.id === 'thread-other')).toEqual(other);
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2', 'obs-3', 'obs-prior']);
  expect(state.observations.find(item => item.id === 'obs-prior')?.inference?.citedObservationIds).toEqual(['obs-1']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-1', 'on-2', 'on-3']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1', 'care-2']);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  const moments = new Map([
    ['obs-2', citedReactionFromFeedback(state.feedback.filter(item => item.observationId === 'obs-2'))!],
    ['obs-3', citedReactionFromFeedback(state.feedback.filter(item => item.observationId === 'obs-3'))!],
  ]);
  const shown = presentConversationAnswer(stored?.answer, undefined, citedReactionsForAnswer(stored?.citedObservationIds, moments));
  expect(shown).toContain('“밥을 줬어요” 이후 “먹었어요”라고 남겼어요');
  expect(shown).toContain('“지켜봤어요” 이후 “그대로였어요”라고 남겼어요');
  expect(shown).not.toContain('따라왔어요');
  expect(shown).not.toContain(citedReactionGoneText);
  await deleteDemoObservation('obs-2');
  const afterDelete = await findDemoConversation('thread-wrong');
  expect(afterDelete?.id).toBe('thread-wrong');
  expect(afterDelete?.answer).toBe(answer);
  expect(afterDelete?.citedObservationIds).toEqual(['obs-2', 'obs-3']);
  expect(afterDelete?.citedCheckinIds).toEqual(['care-1', 'care-2']);
  const remaining = (await getDemo()).feedback.filter(item => item.observationId === 'obs-3');
  const goneMoments = resolveCitedReactionMap({
    ids: afterDelete?.citedObservationIds ?? [],
    known: new Map([['obs-3', citedReactionFromFeedback(remaining)!]]),
    loadedIds: new Set(['obs-3']),
    listComplete: true,
    extra: [],
  });
  expect(goneMoments.get('obs-2')).toEqual({ status: 'gone' });
  const missing = presentConversationAnswer(afterDelete?.answer, undefined, citedReactionsForAnswer(afterDelete?.citedObservationIds, goneMoments));
  expect(missing).toContain(citedReactionGoneText);
  expect(missing).toContain('“지켜봤어요” 이후 “그대로였어요”라고 남겼어요');
  expect(missing).not.toContain('먹었어요');
  expect((await getDemo()).observations.map(item => item.id)).toEqual(['obs-1', 'obs-3', 'obs-prior']);
  expect((await getDemo()).conversations).toHaveLength(3);
});

it('points one cited check-in at another saved check-in and leaves the other citations', async () => {
  const now = new Date('2026-09-10T00:30:00Z');
  const answer = '질문과 맞는 저장 기록을 찾았어요. 오늘 돌봄에 “메모 남기기”라고 골랐고, “창가에서 햇빛을 쬐었어요”라고 적었어요. 2026년 9월 1일 돌봄에 “식사를 챙겼어요”라고 남겼어요. 한 번의 기록으로 이유를 확정할 수는 없어요.';
  const edited = turn('thread-wrong', 'demo-momo', '잘못 가리킨 돌봄', '2026-09-02T00:00:00Z');
  edited.answer = answer;
  edited.citedObservationIds = ['obs-1', 'obs-2'];
  edited.citedCheckinIds = ['care-1', 'care-1'];
  const other = turn('thread-other', 'demo-momo', '다른 질문', '2026-09-03T00:00:00Z');
  const care2 = { ...checkin(), id: 'care-2', kind: 'PLAY' as const, note: '창가를 떠났어요', occurredAt: '2026-09-09T14:59:59Z' };
  const care3 = { ...checkin(), id: 'care-3', petId: 'demo-nabi', kind: 'NOTE' as const, note: '그대로예요', occurredAt: '2026-09-09T15:00:00Z' };
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [observation('obs-1'), observation('obs-2')];
    data.feedback = [reaction('on-1', 'obs-1')];
    data.checkins = [checkin(), care2, care3];
    data.conversations = [edited, other];
  });
  const before = await getDemo();
  const result = await retargetDemoConversationCheckin('thread-wrong', 1, ' care-2 ');
  const stored = await findDemoConversation('thread-wrong');
  const state = await getDemo();
  expect(result.citedCheckinIds).toEqual(['care-1', 'care-2']);
  expect(stored?.answer).toBe(answer);
  expect(stored?.question).toBe('잘못 가리킨 돌봄');
  expect(stored?.id).toBe('thread-wrong');
  expect(stored?.citedObservationIds).toEqual(['obs-1', 'obs-2']);
  expect(state.conversations).toHaveLength(before.conversations.length);
  expect(state.conversations.find(item => item.id === 'thread-other')).toEqual(other);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1', 'care-2', 'care-3']);
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  const moments = new Map<string, CitedCareRecord>([
    ['care-1', { status: 'saved', occurredAt: '2026-09-02T00:00:00Z', kind: 'PLAY', note: '낚싯대로 놀았어요' }],
    ['care-2', { status: 'saved', occurredAt: care2.occurredAt, kind: care2.kind, note: care2.note }],
  ]);
  const shown = presentConversationAnswer(stored?.answer, citedCaresForAnswer(stored?.citedCheckinIds, moments), undefined, now);
  expect(shown).toContain('2026년 9월 2일 돌봄에 “놀아줬어요”라고 골랐고, “낚싯대로 놀았어요”라고 적었어요');
  expect(shown).toContain('2026년 9월 9일 돌봄에 “놀아줬어요”라고 골랐고, “창가를 떠났어요”라고 적었어요');
  expect(shown).not.toContain('식사를 챙겼어요');
  await deleteDemoCheckin('care-2', 1);
  const afterDelete = await findDemoConversation('thread-wrong');
  expect(afterDelete?.citedCheckinIds).toEqual(['care-1', 'care-2']);
  expect(afterDelete?.answer).toBe(answer);
  expect(afterDelete?.citedObservationIds).toEqual(['obs-1', 'obs-2']);
  const gone = new Map(moments);
  gone.set('care-2', { status: 'gone' });
  const missing = presentConversationAnswer(afterDelete?.answer, citedCaresForAnswer(afterDelete?.citedCheckinIds, gone), undefined, now);
  expect(missing).toContain(citedCareGoneText);
  expect(missing).toContain('낚싯대로 놀았어요');
  expect(missing).not.toContain('창가를 떠났어요');
  expect((await getDemo()).checkins.map(item => item.id)).toEqual(['care-1', 'care-3']);
  expect((await getDemo()).conversations).toHaveLength(2);
});

it('refuses a citation that is not another saved record and does not invent an account update', async () => {
  const saved = turn('thread-wrong', 'demo-momo', '잘못 가리킨 질문', '2026-09-02T00:00:00Z');
  saved.answer = '저장된 답';
  saved.citedObservationIds = ['obs-1', 'obs-1'];
  saved.citedCheckinIds = ['care-1'];
  await changeDemo(data => {
    data.observations = [observation('obs-1'), observation('obs-2')];
    data.checkins = [checkin()];
    data.conversations = [saved];
  });
  await expect(retargetDemoConversationObservation('thread-wrong', 0, 'obs-1')).rejects.toThrow('INVALID_CONVERSATION_CITATION');
  await expect(retargetDemoConversationObservation('thread-wrong', 0, '   ')).rejects.toThrow('INVALID_CONVERSATION_CITATION');
  await expect(retargetDemoConversationObservation('thread-wrong', -1, 'obs-2')).rejects.toThrow('INVALID_CONVERSATION_CITATION');
  await expect(retargetDemoConversationObservation('thread-wrong', 1.5, 'obs-2')).rejects.toThrow('INVALID_CONVERSATION_CITATION');
  await expect(retargetDemoConversationObservation('thread-wrong', 2, 'obs-2')).rejects.toThrow('INVALID_CONVERSATION_CITATION');
  await expect(retargetDemoConversationObservation('missing', 0, 'obs-2')).rejects.toThrow('NOT_FOUND');
  await expect(retargetDemoConversationObservation('thread-wrong', 0, 'missing-obs')).rejects.toThrow('NOT_FOUND');
  await expect(retargetDemoConversationCheckin('thread-wrong', 0, 'care-1')).rejects.toThrow('INVALID_CONVERSATION_CITATION');
  await expect(retargetDemoConversationCheckin('thread-wrong', 0, 'missing-care')).rejects.toThrow('NOT_FOUND');
  await expect(retargetDemoConversationCheckin('thread-wrong', 1, 'care-1')).rejects.toThrow('INVALID_CONVERSATION_CITATION');
  const kept = await getDemo();
  expect(kept.conversations).toHaveLength(1);
  expect(kept.conversations[0]).toEqual(saved);
  expect(kept.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(kept.checkins.map(item => item.id)).toEqual(['care-1']);
  const moved = await retargetDemoConversationObservation('thread-wrong', 1, 'obs-2');
  expect(moved.citedObservationIds).toEqual(['obs-1', 'obs-2']);
  expect(moved.answer).toBe('저장된 답');
  expect(moved.citedCheckinIds).toEqual(['care-1']);
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(retargetDemoConversationObservation('thread-wrong', 0, 'obs-2')).rejects.toThrow('CONSENT_REQUIRED');
  await expect(retargetDemoConversationCheckin('thread-wrong', 0, 'care-1')).rejects.toThrow('CONSENT_REQUIRED');
  expect(await findDemoConversation('thread-wrong')).toMatchObject({ id: 'thread-wrong', citedObservationIds: ['obs-1', 'obs-2'], citedCheckinIds: ['care-1'], answer: '저장된 답' });
  expect(errorMessage(new Error('INVALID_CONVERSATION_CITATION'))).toBe('바꿀 인용을 확인해 주세요.');
  expect(errorMessage(new Error('CONVERSATION_CITATION_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 대화의 인용은 여기서 바꿀 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});
