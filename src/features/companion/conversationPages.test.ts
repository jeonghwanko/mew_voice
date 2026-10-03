import { CONVERSATION_PAGE_CAP, CONVERSATION_PAGE_SIZE, loadConversationPages } from './conversationPages';
import { pageObservations } from './observationPages';

test('saved conversation pages keep turns past the first page', async () => {
  const items = Array.from({ length: CONVERSATION_PAGE_SIZE + 2 }, (_, index) => ({ id: `id-${index}`, createdAt: `2026-10-03T00:00:${String(index).padStart(2, '0')}Z` }));
  const loaded = await loadConversationPages(cursor => Promise.resolve(pageObservations(items, cursor, CONVERSATION_PAGE_SIZE)));
  expect(loaded.items).toHaveLength(CONVERSATION_PAGE_SIZE + 2);
  expect(loaded.items.at(-1)?.id).toBe('id-0');
  expect(loaded.nextCursor).toBeNull();
});

test('a repeated conversation cursor stops the walk', async () => {
  const fetchPage = jest.fn(async (cursor: string | null) => ({ items: [{ id: cursor ?? 'first' }], nextCursor: 'stuck' }));
  const loaded = await loadConversationPages(fetchPage);
  expect(fetchPage).toHaveBeenCalledTimes(2);
  expect(loaded.items.map(item => item.id)).toEqual(['first', 'stuck']);
  expect(loaded.nextCursor).toBeNull();
});

test('conversation loading stops at the documented page cap', async () => {
  let n = 0;
  const loaded = await loadConversationPages(async () => {
    const id = `id-${n}`;
    n += 1;
    return { items: [{ id }], nextCursor: `cursor-${n}` };
  }, CONVERSATION_PAGE_CAP);
  expect(loaded.items).toHaveLength(CONVERSATION_PAGE_CAP);
  expect(loaded.nextCursor).toBe(`cursor-${CONVERSATION_PAGE_CAP}`);
});
