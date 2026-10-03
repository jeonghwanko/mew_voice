import { homeQuestionHref } from './homeConversation';

/** Where an observation was opened from. Only a real conversation id may leave the current screen. */
export type ObservationExitInput = {
  returnTo?: string | string[];
  conversationId?: string | string[];
  petId?: string | string[];
};

export type CitationOrigin = 'conversation' | 'home';

function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = raw?.trim();
  return text || undefined;
}

/**
 * Cited observation opened from a saved conversation or the home chat.
 * History and a missing thread stay on the plain observation route.
 */
export function citedObservationHref(observationId: string, conversationId: string, petId?: string, origin: CitationOrigin = 'conversation') {
  const id = observationId.trim();
  const thread = conversationId.trim();
  if (!id) return '/history';
  const path = `/observations/${encodeURIComponent(id)}`;
  if (!thread) return path;
  const query = [`returnTo=${origin}`, `conversationId=${encodeURIComponent(thread)}`];
  const pet = petId?.trim();
  if (pet) query.push(`petId=${encodeURIComponent(pet)}`);
  return `${path}?${query.join('&')}`;
}

/**
 * Earlier observation opened from “보호자가 남긴 반응 보기”.
 * Keeps the question id, pet, and return path already on this screen.
 * History, and an open without that id, stays on the plain observation route. The thread is not rewritten.
 */
export function citedPriorObservationHref(observationId: string, input: ObservationExitInput) {
  const returnTo = firstParam(input.returnTo);
  const conversationId = firstParam(input.conversationId);
  if ((returnTo === 'home' || returnTo === 'conversation') && conversationId) {
    return citedObservationHref(observationId, conversationId, firstParam(input.petId), returnTo);
  }
  return citedObservationHref(observationId, '');
}

/**
 * After a new reaction is saved, return to the question that opened this observation.
 * The conversation tab and the home chat both keep the stored thread id and pet.
 * History, and a home open without that id, stay on the observation. The thread is not rewritten.
 */
export function observationExitHref(input: ObservationExitInput): `/(tabs)/conversation?${string}` | ReturnType<typeof homeQuestionHref> | null {
  const returnTo = firstParam(input.returnTo);
  if (returnTo !== 'conversation' && returnTo !== 'home') return null;
  const conversationId = firstParam(input.conversationId);
  if (!conversationId) return null;
  const petId = firstParam(input.petId);
  if (returnTo === 'home') return homeQuestionHref(conversationId, petId);
  const query = [`conversationId=${encodeURIComponent(conversationId)}`];
  if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
  return `/(tabs)/conversation?${query.join('&')}`;
}

/**
 * Leaving without a new reaction.
 * A citation from the home chat or the conversation tab returns to that question.
 * History, and an open without that id, stays on the record list. The thread is not rewritten.
 */
export function observationLeaveHref(input: ObservationExitInput): NonNullable<ReturnType<typeof observationExitHref>> | '/history' {
  return observationExitHref(input) ?? '/history';
}
