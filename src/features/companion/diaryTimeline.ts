import type { CompanionConversation } from '@findthem/shared';

export type DiaryConversationRow = {
  id: string;
  at: string;
  label: string;
  note: string | null;
  target: string;
};

/** Saved turns already loaded for this cat. Account and demo use the same list; nothing is invented past it. */
export function diaryConversationRows(items: readonly CompanionConversation[], petId: string | null | undefined): DiaryConversationRow[] {
  if (!petId) return [];
  return items.filter(item => item.petId === petId).map(item => ({
    id: `conversation-${item.id}`,
    at: item.createdAt,
    label: item.question,
    note: item.answer,
    target: `/(tabs)/conversation?conversationId=${encodeURIComponent(item.id)}`,
  }));
}

/** Diary intro. Demo stays an on-device record, not an analysis, a score, or a translation. */
export function diaryIntro(demo: boolean) {
  if (demo) return '사진, 울음, 짧은 영상, 돌봄 기록과 이 기기에 남긴 이야기를 시간순으로 모았어요. 체험 대화는 실제 AI 분석이 아니에요.';
  return '사진, 울음, 짧은 영상, 돌봄 기록과 나눈 이야기를 시간순으로 모았어요.';
}

/** Union of list pages already on screen. The first copy of an id wins. Nothing is added that no page returned. */
export function mergeDiaryRecords<T extends { id: string }>(groups: readonly (readonly T[])[]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

/**
 * Append one already-fetched page.
 * A null or already-requested nextCursor stops the walk and does not create a placeholder row.
 */
export function appendDiaryPage<T extends { id: string }>(
  items: readonly T[],
  page: { items: readonly T[]; nextCursor: string | null },
  requestedCursor: string,
  seenCursors: readonly string[],
): { items: T[]; nextCursor: string | null; seenCursors: string[] } {
  const seen = new Set(seenCursors);
  seen.add(requestedCursor);
  const merged = mergeDiaryRecords([items, page.items]);
  const next = page.nextCursor;
  if (!next || seen.has(next)) return { items: merged, nextCursor: null, seenCursors: [...seen] };
  return { items: merged, nextCursor: next, seenCursors: [...seen] };
}
