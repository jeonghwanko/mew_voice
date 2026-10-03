import type { CompanionConversation } from '@findthem/shared';
import { appendDiaryPage, diaryConversationRows, diaryIntro, mergeDiaryRecords } from './diaryTimeline';
import { pageObservations } from './observationPages';
import { loadPagesForWeek } from './weeklyPages';

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

const now = new Date('2026-10-03T02:00:00Z');
const observation = (id: string, createdAt: string) => ({ id, petId: 'cat-a', createdAt, contextTags: ['창가에서'], kind: 'PHOTO' as const });

it('includes the weekly cursor pages the first diary page leaves out', async () => {
  const inWindow = Array.from({ length: 51 }, (_, index) => observation(`in-${index}`, `2026-10-02T00:00:${String(index).padStart(2, '0')}Z`));
  const older = [observation('old', '2026-09-01T00:00:00.000Z')];
  const all = [...inWindow, ...older];
  const first = pageObservations(all, null).items;
  const walked = await loadPagesForWeek(cursor => Promise.resolve(pageObservations(all, cursor)), item => item.createdAt, now);
  const merged = mergeDiaryRecords([first, walked.items]);
  expect(first.some(item => item.id === 'in-0')).toBe(false);
  expect(merged.some(item => item.id === 'in-0')).toBe(true);
  expect(merged.some(item => item.id === 'old')).toBe(true);
  expect(merged.filter(item => item.id === 'in-50')).toHaveLength(1);
  expect(walked.nextCursor).toBeNull();
});

it('does not invent diary rows when the account cursor is null', () => {
  const only = [observation('only', '2026-10-02T00:00:00.000Z')];
  const appended = appendDiaryPage(only, { items: [], nextCursor: null }, 'unused', []);
  expect(appended.items).toEqual(only);
  expect(appended.nextCursor).toBeNull();
  const repeated = appendDiaryPage(only, { items: [observation('again', '2026-10-01T00:00:00.000Z')], nextCursor: 'same' }, 'same', []);
  expect(repeated.items.map(item => item.id)).toEqual(['only', 'again']);
  expect(repeated.nextCursor).toBeNull();
});
