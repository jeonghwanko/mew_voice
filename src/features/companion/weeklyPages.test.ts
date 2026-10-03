import { checkinListPath, observationListPath, pageObservations } from './observationPages';
import { summarizeWeek } from './weeklySummary';
import { WEEKLY_PAGE_CAP, loadPagesForWeek } from './weeklyPages';

const now = new Date('2026-10-03T02:00:00Z');
const observation = (id: string, createdAt: string) => ({ id, petId: 'cat-a', createdAt, contextTags: ['창가에서'], kind: 'PHOTO' as const, feedback: [] as { observationId: string }[] });

test('weekly pages follow the cursor until the 7-day window is covered', async () => {
  const inWindow = Array.from({ length: 51 }, (_, index) => observation(`in-${index}`, `2026-10-02T00:00:${String(index).padStart(2, '0')}Z`));
  const older = [observation('old', '2026-09-01T00:00:00.000Z'), observation('older', '2026-08-01T00:00:00.000Z')];
  const fetchPage = jest.fn((cursor: string | null) => Promise.resolve(pageObservations([...inWindow, ...older], cursor)));
  const loaded = await loadPagesForWeek(fetchPage, item => item.createdAt, now);
  expect(fetchPage).toHaveBeenCalledTimes(2);
  expect(loaded.truncated).toBe(false);
  expect(loaded.items.some(item => item.id === 'older')).toBe(true);
  const summary = summarizeWeek({ petId: 'cat-a', now, demo: true, observations: loaded.items, checkins: [], truncatedObservations: loaded.truncated, truncatedCheckins: false });
  expect(summary.observationCount).toBe(51);
  expect(summary.notice).not.toContain('이전 페이지');
});

test('a repeated weekly cursor stops the walk', async () => {
  const fetchPage = jest.fn(async (cursor: string | null) => ({ items: [observation(cursor ?? 'first', '2026-10-02T00:00:00.000Z')], nextCursor: 'stuck' }));
  const loaded = await loadPagesForWeek(fetchPage, item => item.createdAt, now);
  expect(fetchPage).toHaveBeenCalledTimes(2);
  expect(loaded.items.map(item => item.id)).toEqual(['first', 'stuck']);
  expect(loaded.truncated).toBe(true);
});

test('weekly loading stops at the documented page cap', async () => {
  let n = 0;
  const loaded = await loadPagesForWeek(async () => {
    const id = `id-${n}`;
    n += 1;
    return { items: [observation(id, '2026-10-02T00:00:00.000Z')], nextCursor: `cursor-${n}` };
  }, item => item.createdAt, now, WEEKLY_PAGE_CAP);
  expect(loaded.items).toHaveLength(WEEKLY_PAGE_CAP);
  expect(loaded.truncated).toBe(true);
});

test('a null account cursor does not invent rows and only the capped source stays truncated', async () => {
  const observations = jest.fn(async () => ({ items: [observation('only', '2026-10-02T00:00:00.000Z')], nextCursor: null as string | null }));
  const checkins = jest.fn(async (cursor: string | null) => ({ items: [{ id: cursor ?? 'care-0', petId: 'cat-a', occurredAt: '2026-10-02T00:00:00.000Z' }], nextCursor: `more-${cursor ?? 'start'}` }));
  const loadedObservations = await loadPagesForWeek(observations, item => item.createdAt, now, 3);
  const loadedCheckins = await loadPagesForWeek(checkins, item => item.occurredAt, now, 3);
  expect(observations).toHaveBeenCalledTimes(1);
  expect(observations).toHaveBeenCalledWith(null);
  expect(loadedObservations.items).toHaveLength(1);
  expect(loadedObservations.truncated).toBe(false);
  expect(checkins).toHaveBeenCalledTimes(3);
  expect(loadedCheckins.truncated).toBe(true);
  expect(loadedCheckins.items).toHaveLength(3);
  const summary = summarizeWeek({
    petId: 'cat-a', now, demo: false,
    observations: loadedObservations.items,
    checkins: loadedCheckins.items,
    truncatedObservations: loadedObservations.truncated,
    truncatedCheckins: loadedCheckins.truncated,
  });
  expect(summary.observationCount).toBe(1);
  expect(summary.checkinCount).toBe(3);
  expect(summary.notice).toContain('돌봄 이전 페이지는 세지 않아요');
  expect(summary.notice).not.toContain('관찰 이전 페이지');
  expect(observationListPath('cat-a', null)).toBe('/pet-companion/observations?petId=cat-a&limit=50');
  expect(checkinListPath('cat-a', 'a/b')).toBe('/pet-companion/checkins?petId=cat-a&limit=50&cursor=a%2Fb');
});

test('a page that crosses the weekly window is not followed', async () => {
  const fetchPage = jest.fn(async (cursor: string | null) => {
    if (!cursor) return { items: [observation('new', '2026-10-02T00:00:00.000Z')], nextCursor: 'older-page' };
    if (cursor === 'older-page') return { items: [observation('old', '2026-09-01T00:00:00.000Z')], nextCursor: 'ancient' };
    return { items: [observation('ancient', '2026-01-01T00:00:00.000Z')], nextCursor: null };
  });
  const loaded = await loadPagesForWeek(fetchPage, item => item.createdAt, now);
  expect(fetchPage.mock.calls.map(call => call[0])).toEqual([null, 'older-page']);
  expect(loaded.truncated).toBe(false);
  expect(loaded.items.map(item => item.id)).toEqual(['new', 'old']);
});
