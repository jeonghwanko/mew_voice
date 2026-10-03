import type { CompanionConversation } from '@findthem/shared';

/** Saved turn shown in the home chat. Pending replaces the same id. */
export type HomeConversationTurn = Pick<CompanionConversation, 'id' | 'petId' | 'question' | 'answer' | 'status' | 'createdAt'> & Partial<Pick<CompanionConversation, 'citedObservationIds' | 'citedCheckinIds'>>;

/** Oldest first, for the selected cat only, so earlier turns stay readable above the latest reply. */
export function homeConversationThread<T extends HomeConversationTurn>(items: readonly T[], petId: string | null | undefined, pending?: T | null): T[] {
  if (!petId) return [];
  const byId = new Map<string, T>();
  for (const item of items) if (item.petId === petId) byId.set(item.id, item);
  if (pending?.petId === petId) byId.set(pending.id, pending);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Newest completed reply already in the thread. Empty when nothing was saved. */
export function latestHomeAnswer(turns: readonly HomeConversationTurn[]): string | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.status !== 'COMPLETED') continue;
    const answer = turn.answer?.trim();
    if (answer) return answer;
  }
  return null;
}
