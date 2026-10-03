import { changeDemo, getDemo, initialDemo } from './demo';
import { saveDemoCheckin, updateDemoCheckin, deleteDemoCheckin } from './checkinStore';
import { citedCareName, conversationCitedCheckinLink, dayKey, formatDiaryDay, homeCitedCheckinLink, isToday, presentCareMention, recentRecordedDays, resolveSelectedPet, todayCheckinSummary, todayCheckins } from './daily';
import { formatDayKey } from './weeklySummary';
jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));
const draft = () => ({ petId: 'demo-momo', kind: 'PLAY' as const, note: '낚싯대 놀이', occurredAt: '2026-09-01T12:00:00.000Z', idempotencyKey: 'checkin-one' });
beforeEach(async () => { await changeDemo(data => Object.assign(data, initialDemo())); });
it('saves a photo-free record without fabricating an AI observation', async () => {
  const saved = await saveDemoCheckin(draft());
  expect(saved.kind).toBe('PLAY');
  expect((await getDemo()).observations).toHaveLength(0);
  expect((await getDemo()).checkins).toHaveLength(1);
});
it('deduplicates concurrent retries and rejects changed request bodies', async () => {
  const [a, b] = await Promise.all([saveDemoCheckin(draft()), saveDemoCheckin(draft())]);
  expect(a.id).toBe(b.id);
  expect((await getDemo()).checkins).toHaveLength(1);
  await expect(saveDemoCheckin({ ...draft(), note: '다른 내용' })).rejects.toThrow('IDEMPOTENCY_CONFLICT');
});
it('keeps original idempotency after edits and prevents stale edits', async () => {
  const saved = await saveDemoCheckin(draft());
  await updateDemoCheckin(saved.id, { version: 1, note: '수정했어요' });
  expect((await saveDemoCheckin(draft())).note).toBe('수정했어요');
  await expect(updateDemoCheckin(saved.id, { version: 1, note: '이전 기기' })).rejects.toThrow('EDIT_CONFLICT');
});
it('does not revive deleted data on a late retry', async () => {
  const saved = await saveDemoCheckin(draft());
  await deleteDemoCheckin(saved.id, 1);
  await expect(saveDemoCheckin(draft())).rejects.toThrow('NOT_FOUND');
});
it('requires valid pet and consent but allows deletion after consent withdrawal', async () => {
  await expect(saveDemoCheckin({ ...draft(), petId: 'someone-else' })).rejects.toThrow('NOT_FOUND');
  const saved = await saveDemoCheckin(draft());
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(saveDemoCheckin({ ...draft(), idempotencyKey: 'two' })).rejects.toThrow('CONSENT_REQUIRED');
  await expect(deleteDemoCheckin(saved.id, 1)).resolves.toBeUndefined();
});
it('validates meaningful notes and rejects future time', async () => {
  await expect(saveDemoCheckin({ ...draft(), kind: 'NOTE', note: ' ' })).rejects.toThrow('INVALID_CHECKIN');
  await expect(saveDemoCheckin({ ...draft(), occurredAt: '2999-01-01T00:00:00Z' })).rejects.toThrow('INVALID_CHECKIN_TIME');
});
it('counts distinct KST days, excluding future and older days', () => {
  const now = new Date('2026-09-10T00:00:00Z');
  expect(dayKey('2026-09-09T15:00:00Z')).toBe('2026-09-10');
  expect(isToday('2026-09-09T14:59:59Z', now)).toBe(false);
  expect(recentRecordedDays(['2026-09-09T15:00:00Z','2026-09-09T16:00:00Z','2026-09-10T02:00:00Z','2026-09-01T12:00:00Z'], now)).toBe(1);
});
it('falls back only when the selected pet is no longer available', () => {
  const pets = initialDemo().pets;
  const other = { ...pets[0], id: 'other', name: '보리' };
  expect(resolveSelectedPet([...pets, other], 'other')?.name).toBe('보리');
  expect(resolveSelectedPet(pets, 'removed')?.id).toBe('demo-momo');
  expect(resolveSelectedPet([], 'removed')).toBeUndefined();
});

it('keeps only the selected cat check-ins from the current KST day, newest first', () => {
  const now = new Date('2026-09-10T00:30:00Z');
  const items = [
    { id: 'yesterday', petId: 'demo-momo', kind: 'MEAL', note: '간식', occurredAt: '2026-09-09T14:59:59Z' },
    { id: 'midnight', petId: 'demo-momo', kind: 'PLAY', note: '낚싯대', occurredAt: '2026-09-09T15:00:00Z' },
    { id: 'later', petId: 'demo-momo', kind: 'CHECKED', note: null, occurredAt: '2026-09-10T14:59:59Z' },
    { id: 'next-day', petId: 'demo-momo', kind: 'NOTE', note: '내일', occurredAt: '2026-09-10T15:00:00Z' },
    { id: 'other', petId: 'other-cat', kind: 'PLAY', note: '다른 아이', occurredAt: '2026-09-10T01:00:00Z' },
  ];
  expect(todayCheckins(items, 'demo-momo', now).map(item => item.id)).toEqual(['later', 'midnight']);
  expect(todayCheckins(items, 'missing', now)).toEqual([]);
  expect(todayCheckins(items, null, now)).toEqual([]);
  expect(todayCheckinSummary([])).toBeNull();
  expect(todayCheckinSummary(todayCheckins(items, 'demo-momo', now))).toEqual({ title: '특이사항 없어요', detail: '메모 없이 남긴 보호자 기록이에요 · 다른 기록: 놀아줬어요' });
  expect(todayCheckinSummary([{ kind: 'PLAY', note: '  낚싯대  ' }])).toEqual({ title: '놀아줬어요', detail: '낚싯대' });
});

it('names a cited check-in by the KST day and does not call an earlier day today', () => {
  const now = new Date('2026-09-10T00:30:00Z');
  const todayAt = '2026-09-09T15:00:00Z';
  const earlierAt = '2026-09-09T14:59:59Z';
  expect(dayKey(todayAt)).toBe('2026-09-10');
  expect(formatDiaryDay('2026-09-09')).toBe(formatDayKey('2026-09-09'));
  expect(citedCareName(todayAt, now)).toBe('오늘 돌봄');
  expect(citedCareName(earlierAt, now)).toBe('2026년 9월 9일 돌봄');
  expect(citedCareName('2026-09-10T15:00:00Z', now)).toBe('2026년 9월 11일 돌봄');
  expect(citedCareName('not-a-time', now)).toBe('돌봄 기록');
  expect(citedCareName(undefined, now)).toBe('돌봄 기록');
  expect(homeCitedCheckinLink(todayAt, 0, now)).toBe('참고한 오늘 돌봄 1 보기 →');
  expect(homeCitedCheckinLink(earlierAt, 1, now)).toBe('참고한 2026년 9월 9일 돌봄 2 보기 →');
  expect(homeCitedCheckinLink(undefined, 0, now)).toBe('참고한 돌봄 기록 1 보기 →');
  expect(conversationCitedCheckinLink(todayAt, 0, now)).toBe('근거가 된 오늘 돌봄 기록 1 보기 →');
  expect(conversationCitedCheckinLink(earlierAt, 0, now)).toBe('근거가 된 2026년 9월 9일 돌봄 기록 1 보기 →');
  expect(conversationCitedCheckinLink(undefined, 0, now)).toBe('근거가 된 돌봄 기록 1 보기 →');
  const savedAsToday = '질문과 맞는 저장 기록을 찾았어요. 오늘 돌봄에 “식사를 챙겼어요”라고 남겼어요. 오늘 돌봄이라고 메모했어요.';
  expect(presentCareMention(savedAsToday, earlierAt, now)).toBe('질문과 맞는 저장 기록을 찾았어요. 2026년 9월 9일 돌봄에 “식사를 챙겼어요”라고 남겼어요. 오늘 돌봄이라고 메모했어요.');
  const savedAsDated = savedAsToday.replace('오늘 돌봄에', '2026년 9월 10일 돌봄에');
  expect(presentCareMention(savedAsDated, todayAt, now)).toBe(savedAsToday);
  expect(presentCareMention(savedAsToday, undefined, now)).toBe(savedAsToday);
});
