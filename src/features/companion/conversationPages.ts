import type { CompanionConversation, CompanionListResponse } from '@findthem/shared';
import { api } from '../../lib/api';
import { demoConversationsFor, getDemo } from './demo';
import { OBSERVATION_PAGE_SIZE, pageObservations } from './observationPages';

/** Same page size the observation list already sends. The conversation list is the existing GET, not a new route. */
export const CONVERSATION_PAGE_SIZE = OBSERVATION_PAGE_SIZE;

/**
 * How many list responses to follow for one cat.
 * 20 × 50 = 1000 turns. A repeated or empty nextCursor stops earlier so a stuck cursor cannot loop.
 */
export const CONVERSATION_PAGE_CAP = 20;

/** Existing list URL. nextCursor is sent back as cursor, unchanged, the same way observations page. */
export function conversationListPath(petId: string, cursor: string | null): string {
  const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
  return `/pet-companion/pets/${petId}/conversations?limit=${CONVERSATION_PAGE_SIZE}${cursorQuery}`;
}

/** Walk nextCursor until the thread is loaded or CONVERSATION_PAGE_CAP pages have been read. */
export async function loadConversationPages<T extends { id: string }>(
  fetchPage: (cursor: string | null) => Promise<CompanionListResponse<T>>,
  cap = CONVERSATION_PAGE_CAP,
): Promise<CompanionListResponse<T>> {
  const items: T[] = [];
  const seenIds = new Set<string>();
  const requested = new Set<string | null>();
  let cursor: string | null = null;
  for (let page = 0; page < cap; page += 1) {
    if (requested.has(cursor)) return { items, nextCursor: null };
    requested.add(cursor);
    const result = await fetchPage(cursor);
    for (const item of result.items) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      items.push(item);
    }
    const next = result.nextCursor;
    if (!next || requested.has(next)) return { items, nextCursor: null };
    cursor = next;
  }
  return { items, nextCursor: cursor };
}

export function loadSavedConversations(demo: boolean, petId: string): Promise<CompanionListResponse<CompanionConversation>> {
  return loadConversationPages(async cursor => {
    if (demo) return pageObservations(demoConversationsFor(await getDemo(), petId), cursor, CONVERSATION_PAGE_SIZE);
    return api.get<CompanionListResponse<CompanionConversation>>(conversationListPath(petId, cursor));
  });
}
