import { homeConversationThread, latestHomeAnswer, type HomeConversationTurn } from './homeConversation';

const momo: HomeConversationTurn[] = [
  { id: 'b', petId: 'demo-momo', question: '나중 질문', answer: '나중 답', status: 'COMPLETED' as const, createdAt: '2026-10-03T02:00:00Z', citedObservationIds: ['obs-2'] },
  { id: 'a', petId: 'demo-momo', question: '먼저 질문', answer: '먼저 답', status: 'COMPLETED' as const, createdAt: '2026-10-03T01:00:00Z', citedCheckinIds: ['care-1'] },
  { id: 'other', petId: 'other-cat', question: '다른 아이', answer: '다른 답', status: 'COMPLETED' as const, createdAt: '2026-10-03T03:00:00Z' },
  { id: 'tie-b', petId: 'demo-momo', question: '같은 시각 나중', answer: 'tie b', status: 'COMPLETED' as const, createdAt: '2026-10-03T01:00:00Z' },
];

it('shows the selected cat’s saved thread oldest first, including an in-flight reply', () => {
  const pending = { id: 'b', petId: 'demo-momo', question: '나중 질문', answer: null, status: 'QUEUED' as const, createdAt: '2026-10-03T02:00:00Z' };
  expect(homeConversationThread(momo, 'demo-momo', pending).map(item => item.id)).toEqual(['a', 'tie-b', 'b']);
  expect(homeConversationThread(momo, 'demo-momo', pending).find(item => item.id === 'b')?.status).toBe('QUEUED');
  expect(homeConversationThread(momo, 'other-cat').map(item => item.question)).toEqual(['다른 아이']);
  expect(homeConversationThread(momo, null, momo[0])).toEqual([]);
  expect(homeConversationThread(momo, 'demo-momo', { ...momo[2], id: 'stray' })).toHaveLength(3);
});

it('reads the newest saved reply and does not invent one', () => {
  const turns = homeConversationThread(momo, 'demo-momo');
  expect(latestHomeAnswer(turns)).toBe('나중 답');
  expect(latestHomeAnswer([{ id: 'fail', petId: 'demo-momo', question: '실패', answer: '없는 답', status: 'FAILED', createdAt: '2026-10-03T04:00:00Z' }])).toBeNull();
  expect(latestHomeAnswer([{ id: 'blank', petId: 'demo-momo', question: '빈 답', answer: '  ', status: 'COMPLETED', createdAt: '2026-10-03T04:00:00Z' }])).toBeNull();
});
