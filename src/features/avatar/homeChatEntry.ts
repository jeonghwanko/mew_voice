/** One home control opens the chat sheet. A saved thread is reread there, and a new question is written there. Both stay visible. */
export const HOME_CHAT_CONTINUE = '이전 대화 이어 읽기';
export const HOME_CHAT_WRITE = '글로 대화하기';
/** Same line the chat sheet uses while the saved list is still in flight. Not an answer being prepared. */
export const HOME_CHAT_LIST_LOADING = '이전 대화를 확인하고 있어요.';
/** Same line the chat sheet uses when that list cannot be read. Not an empty thread. */
export const HOME_CHAT_LIST_FAILED = '이전 대화를 불러오지 못했어요.';

export function homeChatEntry(input: { thinking: boolean; saved: boolean; loading?: boolean; failed?: boolean; petName?: string | null }) {
  if (input.thinking) return { title: '답변을 준비하고 있어요…', detail: null as string | null, accessibilityLabel: HOME_CHAT_WRITE };
  if (input.saved) {
    return {
      title: HOME_CHAT_CONTINUE,
      detail: HOME_CHAT_WRITE,
      accessibilityLabel: `${HOME_CHAT_CONTINUE}, ${HOME_CHAT_WRITE}`,
    };
  }
  if (input.loading) {
    return { title: HOME_CHAT_LIST_LOADING, detail: null as string | null, accessibilityLabel: HOME_CHAT_LIST_LOADING };
  }
  if (input.failed) {
    return { title: HOME_CHAT_LIST_FAILED, detail: null as string | null, accessibilityLabel: HOME_CHAT_LIST_FAILED };
  }
  return {
    title: input.petName ? `${input.petName}에게 궁금한 이야기` : '우리 아이와 대화하기',
    detail: null as string | null,
    accessibilityLabel: HOME_CHAT_WRITE,
  };
}
