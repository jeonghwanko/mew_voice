import { homeQuestionHref } from './homeConversation';

/** Where a check-in was opened from. Only a real conversation id may leave the home path. */
export type CheckinExitInput = {
  returnTo?: string | string[];
  conversationId?: string | string[];
  petId?: string | string[];
};

export type CheckinOrigin = 'conversation' | 'home';

function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = raw?.trim();
  return text || undefined;
}

/**
 * Cited check-in opened from a saved conversation or the home chat.
 * History and a missing thread stay on the plain edit route.
 */
export function citedCheckinHref(checkinId: string, conversationId: string, petId?: string, origin: CheckinOrigin = 'conversation') {
  const id = checkinId.trim();
  const thread = conversationId.trim();
  if (!id || !thread) return id ? `/checkin?id=${encodeURIComponent(id)}` : '/checkin';
  const query = [`id=${encodeURIComponent(id)}`, `returnTo=${origin}`, `conversationId=${encodeURIComponent(thread)}`];
  const pet = petId?.trim();
  if (pet) query.push(`petId=${encodeURIComponent(pet)}`);
  return `/checkin?${query.join('&')}`;
}

/**
 * After save or delete, return to the question that opened this check-in.
 * The conversation tab and the home chat both keep the stored thread id and pet.
 * History still goes home. A home open without that id also goes home, and the thread is not rewritten.
 */
export function checkinExitHref(input: CheckinExitInput): '/' | `/(tabs)/conversation?${string}` | ReturnType<typeof homeQuestionHref> {
  const returnTo = firstParam(input.returnTo);
  const conversationId = firstParam(input.conversationId);
  const petId = firstParam(input.petId);
  if (returnTo === 'home' && conversationId) return homeQuestionHref(conversationId, petId);
  if (returnTo !== 'conversation' || !conversationId) return '/';
  const query = [`conversationId=${encodeURIComponent(conversationId)}`];
  if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
  return `/(tabs)/conversation?${query.join('&')}`;
}

/**
 * Leaving without saving or deleting a check-in.
 * A citation from the home chat or the conversation tab returns to that question.
 * History keeps the previous screen. The stored thread is not rewritten.
 */
export function checkinContinueHref(input: CheckinExitInput): Exclude<ReturnType<typeof checkinExitHref>, '/'> | null {
  const next = checkinExitHref(input);
  return next === '/' ? null : next;
}
