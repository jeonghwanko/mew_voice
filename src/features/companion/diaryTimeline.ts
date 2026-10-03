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
