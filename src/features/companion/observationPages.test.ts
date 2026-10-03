import { OBSERVATION_PAGE_SIZE, pageObservations } from './observationPages';

test('observation pages follow the cursor instead of stopping at 50', () => {
  const items = Array.from({ length: OBSERVATION_PAGE_SIZE + 1 }, (_, index) => ({ id: `id-${index}`, createdAt: `2026-10-03T00:00:${String(index).padStart(2, '0')}Z` }));
  const first = pageObservations(items, null);
  expect(first.items).toHaveLength(50);
  expect(first.items[0].id).toBe('id-50');
  expect(first.nextCursor).toBe('id-1');
  const second = pageObservations(items, first.nextCursor);
  expect(second.items.map(item => item.id)).toEqual(['id-0']);
  expect(second.nextCursor).toBeNull();
  expect(pageObservations(items, 'missing').items).toEqual([]);
});
