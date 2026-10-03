import type { CompanionCheckin, CompanionListResponse, CompanionObservation } from '@findthem/shared';
import { api } from '../../lib/api';
import { CONVERSATION_PAGE_CAP } from './conversationPages';
import { getDemo } from './demo';
import { checkinListPath, observationListPath, pageObservations } from './observationPages';
import { weekWindow } from './weeklySummary';

/**
 * Same documented cap as saved conversations: 20 × 50 = 1000 rows.
 * A repeated cursor or a null nextCursor stops earlier so a stuck cursor cannot loop.
 * The weekly walk also stops once a newest-first page includes a row older than the 7-day KST window.
 */
export const WEEKLY_PAGE_CAP = CONVERSATION_PAGE_CAP;

/**
 * Follow nextCursor the same way conversation pages do.
 * Stop when the 7-day window is covered, the cursor repeats, or WEEKLY_PAGE_CAP pages have been read.
 * A null nextCursor is the end of that list: do not synthesize another page from the last id.
 * truncated is true only when the walk stops with the window still open (cap or a repeated cursor).
 */
export async function loadPagesForWeek<T extends { id: string }>(
  fetchPage: (cursor: string | null) => Promise<CompanionListResponse<T>>,
  timeOf: (item: T) => string,
  now = new Date(),
  cap = WEEKLY_PAGE_CAP,
): Promise<{ items: T[]; truncated: boolean }> {
  const startMs = weekWindow(now).startMs;
  const items: T[] = [];
  const seenIds = new Set<string>();
  const requested = new Set<string | null>();
  let cursor: string | null = null;
  const windowCovered = () => items.some(item => {
    const time = new Date(timeOf(item)).getTime();
    return Number.isFinite(time) && time < startMs;
  });
  for (let page = 0; page < cap; page += 1) {
    if (requested.has(cursor)) return { items, truncated: !windowCovered() };
    requested.add(cursor);
    const result = await fetchPage(cursor);
    for (const item of result.items) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      items.push(item);
    }
    const next = result.nextCursor;
    if (!next) return { items, truncated: false };
    if (windowCovered()) return { items, truncated: false };
    if (requested.has(next)) return { items, truncated: true };
    cursor = next;
  }
  return { items, truncated: !windowCovered() };
}

async function fetchObservationPage(demo: boolean, petId: string, cursor: string | null): Promise<CompanionListResponse<CompanionObservation>> {
  if (!demo) return api.get<CompanionListResponse<CompanionObservation>>(observationListPath(petId, cursor));
  const data = await getDemo();
  const owned = data.observations
    .filter(item => item.petId === petId)
    .map(item => ({ ...item, feedback: data.feedback.filter(entry => entry.observationId === item.id) }));
  return pageObservations(owned, cursor);
}

async function fetchCheckinPage(demo: boolean, petId: string, cursor: string | null): Promise<CompanionListResponse<CompanionCheckin>> {
  if (!demo) return api.get<CompanionListResponse<CompanionCheckin>>(checkinListPath(petId, cursor));
  // Demo check-ins already return the whole cat list with nextCursor null. Do not invent a second page.
  if (cursor) return { items: [], nextCursor: null };
  const items = (await getDemo()).checkins
    .filter(item => item.petId === petId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
  return { items, nextCursor: null };
}

/** Existing observation and check-in lists for one cat, walked until the weekly window is covered. */
export async function loadWeeklyRecords(demo: boolean, petId: string, now = new Date()) {
  const [observations, checkins] = await Promise.all([
    loadPagesForWeek(cursor => fetchObservationPage(demo, petId, cursor), item => item.createdAt, now),
    loadPagesForWeek(cursor => fetchCheckinPage(demo, petId, cursor), item => item.occurredAt, now),
  ]);
  return {
    observations: observations.items,
    checkins: checkins.items,
    observationsTruncated: observations.truncated,
    checkinsTruncated: checkins.truncated,
  };
}
