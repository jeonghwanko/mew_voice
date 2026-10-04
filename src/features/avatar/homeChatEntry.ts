/** One home control opens the chat sheet. A saved thread is reread there, and a new question is written there. Both stay visible. */
export const HOME_CHAT_CONTINUE = '이전 대화 이어 읽기';
export const HOME_CHAT_WRITE = '글로 대화하기';

export function homeChatEntry(input: { thinking: boolean; saved: boolean; petName?: string | null }) {
  if (input.thinking) return { title: '답변을 준비하고 있어요…', detail: null as string | null, accessibilityLabel: HOME_CHAT_WRITE };
  if (input.saved) {
    return {
      title: HOME_CHAT_CONTINUE,
      detail: HOME_CHAT_WRITE,
      accessibilityLabel: `${HOME_CHAT_CONTINUE}, ${HOME_CHAT_WRITE}`,
    };
  }
  return {
    title: input.petName ? `${input.petName}에게 궁금한 이야기` : '우리 아이와 대화하기',
    detail: null as string | null,
    accessibilityLabel: HOME_CHAT_WRITE,
  };
}
