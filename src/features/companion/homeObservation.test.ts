import { HOME_OBSERVATION_EMPTY, homeObservationSummary } from './homeObservation';

const items = [
  { id: 'older-photo', petId: 'demo-momo', kind: 'PHOTO', createdAt: '2026-10-03T05:00:00Z', feedback: [{ id: 'f1', action: '지켜봤어요', reaction: '계속했어요', createdAt: '2026-10-03T05:10:00Z' }] },
  { id: 'newer-audio', petId: 'demo-momo', kind: 'AUDIO', createdAt: '2026-10-03T06:12:00Z', feedback: [
    { id: 'early', action: '쉬게 뒀어요', reaction: '피했어요', createdAt: '2026-10-03T06:20:00Z' },
    { id: 'late', action: '놀아줬어요', reaction: '편안해 보였어요', createdAt: '2026-10-03T06:40:00Z' },
  ] },
  { id: 'other-cat', petId: 'other', kind: 'VIDEO', createdAt: '2026-10-03T09:00:00Z', feedback: [{ reaction: '다른 아이' }] },
  { id: 'tie-b', petId: 'demo-momo', kind: 'VIDEO', createdAt: '2026-10-03T06:12:00Z' },
];

it('shows the selected cat’s latest observation, not another cat or an analysis', () => {
  expect(homeObservationSummary(items, 'demo-momo', true)).toEqual({
    id: 'tie-b',
    kindLabel: '짧은 영상',
    timeLabel: '10월 3일 오후 3:12',
    honesty: '체험으로 남긴 기록이에요. AI로 분석하지 않았어요.',
    reaction: null,
  });
  expect(homeObservationSummary(items.filter(item => item.id !== 'tie-b'), 'demo-momo', true)?.reaction).toBe('놀아줬어요 → 편안해 보였어요');
  expect(homeObservationSummary(items, 'other', false)).toEqual({
    id: 'other-cat',
    kindLabel: '짧은 영상',
    timeLabel: '10월 3일 오후 6:00',
    honesty: '이 영상은 AI로 분석하지 않았어요.',
    reaction: '다른 아이',
  });
  expect(homeObservationSummary([{ id: 'cry', petId: 'demo-momo', kind: 'AUDIO', createdAt: '2026-10-03T00:05:00Z' }], 'demo-momo', false)?.honesty).toBe('이 녹음은 AI로 분석하지 않았어요.');
  expect(homeObservationSummary([{ id: 'pic', petId: 'demo-momo', kind: 'PHOTO', createdAt: 'bad' }], 'demo-momo', false)?.honesty).toBeNull();
  expect(homeObservationSummary(items, 'missing', true)).toBeNull();
  expect(homeObservationSummary(items, null, true)).toBeNull();
  expect(HOME_OBSERVATION_EMPTY).toBe('아직 남긴 사진·울음·영상이 없어요. 사진 찍기나 울음 녹음으로 남겨 둘 수 있어요.');
  expect(HOME_OBSERVATION_EMPTY).not.toMatch(/해석|번역|분석|감정|%/);
  expect(HOME_OBSERVATION_EMPTY).not.toBe('오늘 아직 기록이 없어요');
});
