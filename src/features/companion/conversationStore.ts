import type { CompanionConversation } from '@findthem/shared';
import { changeDemo, getDemo } from './demo';

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

/** The saved thread for this id, on whichever cat now owns it. A missing id is not a new turn. */
export async function findDemoConversation(id: string): Promise<CompanionConversation | null> {
  const thread = id.trim();
  if (!thread) return null;
  const data = await getDemo();
  return data.conversations.find(item => item.id === thread) ?? null;
}

/**
 * Which cat to open when a stored question id is followed.
 * The thread's current cat wins, so a move does not hide it behind the old cat id.
 * A missing thread keeps the cat the link already named. An unknown id does not invent a cat.
 */
export function conversationOpenPet(input: {
  conversationPetId?: string | null;
  requestedPetId?: string | null;
  knownPetIds: readonly string[];
}): string | null {
  const known = new Set(input.knownPetIds);
  const owner = input.conversationPetId?.trim();
  if (owner && known.has(owner)) return owner;
  const requested = input.requestedPetId?.trim();
  if (requested && known.has(requested)) return requested;
  return null;
}

/**
 * Move one saved question-and-answer onto another cat the caregiver already has.
 * The conversation id, question, answer, and citations inside that answer stay on the same row.
 * Other turns, observations, reactions, and care stay. This does not create a conversation or a cat,
 * and it does not rewrite the stored answer.
 */
export async function moveDemoConversation(id: string, petId: string): Promise<CompanionConversation> {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    if (typeof petId !== 'string' || !petId.trim()) throw new Error('INVALID_CONVERSATION_PET');
    const targetId = petId.trim();
    const index = data.conversations.findIndex(item => item.id === id);
    if (index < 0) throw new Error('NOT_FOUND');
    if (!data.pets.some(pet => pet.id === targetId)) throw new Error('NOT_FOUND');
    const current = data.conversations[index];
    if (current.petId === targetId) throw new Error('INVALID_CONVERSATION_PET');
    const updated: CompanionConversation = { ...current, petId: targetId };
    data.conversations[index] = updated;
    return updated;
  });
}
