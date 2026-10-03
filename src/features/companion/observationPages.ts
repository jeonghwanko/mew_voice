/** Matches the documented GET /observations page cap and the check-in page size. */
export const OBSERVATION_PAGE_SIZE = 50;

export type ObservationPage<T> = { items: T[]; nextCursor: string | null };

/** Demo pages use the last item id as the cursor. API mode forwards the server nextCursor unchanged. */
export function pageObservations<T extends { id: string; createdAt: string }>(items: T[], cursor: string | null, limit = OBSERVATION_PAGE_SIZE): ObservationPage<T> {
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  let start = 0;
  if (cursor) {
    const index = sorted.findIndex(item => item.id === cursor);
    if (index < 0) return { items: [], nextCursor: null };
    start = index + 1;
  }
  const page = sorted.slice(start, start + limit);
  const more = start + limit < sorted.length;
  return { items: page, nextCursor: more && page.length ? page[page.length - 1].id : null };
}
