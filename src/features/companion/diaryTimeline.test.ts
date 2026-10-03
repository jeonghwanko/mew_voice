import type { CompanionConversation } from '@findthem/shared';
import { diaryConversationRows, diaryIntro } from './diaryTimeline';

const saved: CompanionConversation[] = [
  { id: 'acct-1', petId: 'cat-a', question: '창가에서 오래 있었나요', answer: '저장한 관찰을 근거로 살펴봤어요.', status: 'COMPLETED', citedObservationIds: [], createdAt: '2026-10-03T01:00:00.000Z', completedAt: '2026-10-03T01:00:00.000Z' },
  { id: 'other', petId: 'cat-b', question: '다른 아이', answer: '다른 답', status: 'COMPLETED', citedObservationIds: [], createdAt: '2026-10-03T03:00:00.000Z', completedAt: '2026-10-03T03:00:00.000Z' },
];

it('keeps the selected cat’s saved account conversations for the diary', () => {
  expect(diaryConversationRows(saved, 'cat-a')).toEqual([{
    id: 'conversation-acct-1',
    at: '2026-10-03T01:00:00.000Z',
    label: '창가에서 오래 있었나요',
    note: '저장한 관찰을 근거로 살펴봤어요.',
    target: '/(tabs)/conversation?conversationId=acct-1',
  }]);
  expect(diaryConversationRows(saved, 'missing')).toEqual([]);
  expect(diaryConversationRows(saved, null)).toEqual([]);
});

it('keeps the on-device diary honest', () => {
  const demo = diaryIntro(true);
  expect(demo).toContain('이 기기에 남긴 이야기');
  expect(demo).toContain('실제 AI 분석이 아니에요');
  expect(demo).not.toMatch(/\d+\s*%/);
  expect(demo).not.toContain('번역');
  expect(diaryIntro(false)).toContain('나눈 이야기');
  expect(diaryIntro(false)).not.toContain('체험');
});
