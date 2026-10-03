/** Where a check-in was opened from. Only a real conversation id may leave the home path. */
export type CheckinExitInput = {
  returnTo?: string | string[];
  conversationId?: string | string[];
  petId?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = raw?.trim();
  return text || undefined;
}

/**
 * Cited check-in opened from a saved conversation.
 * Home, history, and a missing thread stay on the plain edit route.
 */
export function citedCheckinHref(checkinId: string, conversationId: string, petId?: string) {
  const id = checkinId.trim();
  const thread = conversationId.trim();
  if (!id || !thread) return id ? `/checkin?id=${encodeURIComponent(id)}` : '/checkin';
  const query = [`id=${encodeURIComponent(id)}`, 'returnTo=conversation', `conversationId=${encodeURIComponent(thread)}`];
  const pet = petId?.trim();
  if (pet) query.push(`petId=${encodeURIComponent(pet)}`);
  return `/checkin?${query.join('&')}`;
}

/**
 * After save or delete, return to the conversation that opened this check-in.
 * Any other origin, including home, still goes home. The thread id is required so the saved question is not dropped.
 */
export function checkinExitHref(input: CheckinExitInput): '/' | `/(tabs)/conversation?${string}` {
  if (firstParam(input.returnTo) !== 'conversation') return '/';
  const conversationId = firstParam(input.conversationId);
  if (!conversationId) return '/';
  const query = [`conversationId=${encodeURIComponent(conversationId)}`];
  const petId = firstParam(input.petId);
  if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
  return `/(tabs)/conversation?${query.join('&')}`;
}
