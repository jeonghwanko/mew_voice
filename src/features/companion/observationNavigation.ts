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
 * A diary open keeps that same pet’s diary return.
 * A home recent observation keeps returnTo=home even without a conversation id, so saving or leaving still returns home.
 * History, and a conversation open without that id, stays on the plain observation route.
 * The thread is not rewritten.
 */
export function citedPriorObservationHref(observationId: string, input: ObservationExitInput) {
  const returnTo = firstParam(input.returnTo);
  const conversationId = firstParam(input.conversationId);
  const petId = firstParam(input.petId);
  if (returnTo === 'diary') return diaryObservationHref(observationId, petId);
  if (returnTo === 'home' && !conversationId) return homeObservationHref(observationId);
  if ((returnTo === 'home' || returnTo === 'conversation') && conversationId) {
    return citedObservationHref(observationId, conversationId, petId, returnTo);
  }
  return citedObservationHref(observationId, '');
}

/**
 * Observation opened from one pet’s diary.
 * Without that pet, the plain observation route stays so leaving still reaches the record list.
 * The stored thread is not rewritten.
 */
export function diaryObservationHref(observationId: string, petId?: string) {
  const id = observationId.trim();
  if (!id) return '/history';
  const pet = petId?.trim();
  if (!pet) return `/observations/${encodeURIComponent(id)}`;
  return `/observations/${encodeURIComponent(id)}?returnTo=diary&petId=${encodeURIComponent(pet)}`;
}

/**
 * Observation opened from the home recent-observation card.
 * returnTo=home carries no conversation id, so the stored thread is not rewritten.
 * A blank id stays on the record list.
 */
export function homeObservationHref(observationId: string) {
  const id = observationId.trim();
  if (!id) return '/history';
  return `/observations/${encodeURIComponent(id)}?returnTo=home`;
}

/**
 * After a new reaction is saved, return to the question that opened this observation.
 * The conversation tab and the home chat both keep the stored thread id and pet.
 * A diary open returns to that same pet’s diary.
 * A home recent observation, with no thread id, returns to home. History stays on the observation.
 * The thread is not rewritten.
 */
export function observationExitHref(input: ObservationExitInput): '/' | `/(tabs)/conversation?${string}` | `/(tabs)/history?petId=${string}` | ReturnType<typeof homeQuestionHref> | null {
  const returnTo = firstParam(input.returnTo);
  const conversationId = firstParam(input.conversationId);
  const petId = firstParam(input.petId);
  if (returnTo === 'diary' && petId) return `/(tabs)/history?petId=${encodeURIComponent(petId)}`;
  if (returnTo === 'home' && conversationId) return homeQuestionHref(conversationId, petId);
  if (returnTo === 'home') return '/';
  if (returnTo !== 'conversation' || !conversationId) return null;
  const query = [`conversationId=${encodeURIComponent(conversationId)}`];
  if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
  return `/(tabs)/conversation?${query.join('&')}`;
}

/**
 * Leaving without a new reaction.
 * A citation from the home chat or the conversation tab returns to that question.
 * A diary open returns to that same pet’s diary.
 * A home recent observation, with no thread id, returns to home. History stays on the record list.
 * The thread is not rewritten.
 */
export function observationLeaveHref(input: ObservationExitInput): NonNullable<ReturnType<typeof observationExitHref>> | '/history' {
  return observationExitHref(input) ?? '/history';
}
