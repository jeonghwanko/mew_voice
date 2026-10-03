import type { CompanionConversation } from '@findthem/shared';
import { changeDemo } from './demo';

/**
 * Remove one saved question-and-answer turn.
 * The cat, other turns, observations, reactions, and care check-ins stay.
 * A missing row is already gone.
 */
export async function deleteDemoConversation(id: string): Promise<CompanionConversation | null> {
  return changeDemo(data => {
    const existing = data.conversations.find(item => item.id === id);
    if (!existing) return null;
    data.conversations = data.conversations.filter(item => item.id !== id);
    return existing;
  });
}
