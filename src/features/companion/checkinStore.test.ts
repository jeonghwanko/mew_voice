import { changeDemo, getDemo, initialDemo } from './demo';
import { saveDemoCheckin, updateDemoCheckin, deleteDemoCheckin } from './checkinStore';
import { dayKey, isToday, recentRecordedDays, resolveSelectedPet } from './daily';
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
