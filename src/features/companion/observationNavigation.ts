/** Where an observation was opened from. Only a real conversation id may leave the current screen. */
export type ObservationExitInput = {
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
 * Cited observation opened from a saved conversation.
 * Home, history, and a missing thread stay on the plain observation route.
 */
export function citedObservationHref(observationId: string, conversationId: string, petId?: string) {
  const id = observationId.trim();
  const thread = conversationId.trim();
  if (!id) return '/history';
  const path = `/observations/${encodeURIComponent(id)}`;
  if (!thread) return path;
  const query = ['returnTo=conversation', `conversationId=${encodeURIComponent(thread)}`];
  const pet = petId?.trim();
  if (pet) query.push(`petId=${encodeURIComponent(pet)}`);
  return `${path}?${query.join('&')}`;
}

/**
 * After a new reaction is saved, return to the conversation that opened this observation.
 * Home and history keep their current destination. The thread id is required so the saved question is not dropped.
 */
export function observationExitHref(input: ObservationExitInput): `/(tabs)/conversation?${string}` | null {
  if (firstParam(input.returnTo) !== 'conversation') return null;
  const conversationId = firstParam(input.conversationId);
  if (!conversationId) return null;
  const query = [`conversationId=${encodeURIComponent(conversationId)}`];
  const petId = firstParam(input.petId);
  if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
  return `/(tabs)/conversation?${query.join('&')}`;
}
