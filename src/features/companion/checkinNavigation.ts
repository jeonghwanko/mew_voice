import { homeQuestionHref } from './homeConversation';

/** Where a check-in was opened from. A conversation id may return to that question. A diary pet may return to that diary. */
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
 * Check-in opened from one pet’s diary.
 * Without that pet, the plain edit route stays so history can still go home.
 * The stored thread is not rewritten.
 */
export function diaryCheckinHref(checkinId: string, petId?: string) {
  const id = checkinId.trim();
  if (!id) return '/checkin';
  const pet = petId?.trim();
  if (!pet) return `/checkin?id=${encodeURIComponent(id)}`;
  return `/checkin?id=${encodeURIComponent(id)}&returnTo=diary&petId=${encodeURIComponent(pet)}`;
}

/**
 * New check-in started from one pet’s diary.
 * Without that pet, the plain create route stays so a home start can still go home.
 * The stored thread is not rewritten, and an existing check-in id is not invented.
 */
export function diaryNewCheckinHref(petId?: string) {
  const pet = petId?.trim();
  if (!pet) return '/checkin';
  return `/checkin?returnTo=diary&petId=${encodeURIComponent(pet)}`;
}

/** Pet whose diary should reopen. A blank id is not a pet. */
export function diaryPetTarget(input: { petId?: string | string[] }) {
  return firstParam(input.petId) ?? null;
}

/**
 * After save or delete, return to the question that opened this check-in.
 * The conversation tab and the home chat both keep the stored thread id and pet.
 * A diary open returns to that same pet’s diary. History still goes home.
 * A home open without that id also goes home, and the thread is not rewritten.
 */
export function checkinExitHref(input: CheckinExitInput): '/' | `/(tabs)/conversation?${string}` | `/(tabs)/history?petId=${string}` | ReturnType<typeof homeQuestionHref> {
  const returnTo = firstParam(input.returnTo);
  const conversationId = firstParam(input.conversationId);
  const petId = firstParam(input.petId);
  if (returnTo === 'diary' && petId) return `/(tabs)/history?petId=${encodeURIComponent(petId)}`;
  if (returnTo === 'home' && conversationId) return homeQuestionHref(conversationId, petId);
  if (returnTo !== 'conversation' || !conversationId) return '/';
  const query = [`conversationId=${encodeURIComponent(conversationId)}`];
  if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
  return `/(tabs)/conversation?${query.join('&')}`;
}

/**
 * Leaving without saving or deleting a check-in.
 * A citation from the home chat or the conversation tab returns to that question.
 * A diary open returns to that same pet’s diary. History keeps the previous screen.
 * The stored thread is not rewritten.
 */
export function checkinContinueHref(input: CheckinExitInput): Exclude<ReturnType<typeof checkinExitHref>, '/'> | null {
  const next = checkinExitHref(input);
  return next === '/' ? null : next;
}

/**
 * A cited check-in that cannot be loaded, or belongs to another pet.
 * The home chat or the conversation tab returns to that stored question.
 * A diary open returns to that same pet’s diary. Without that question, the record list stays.
 * The thread is not rewritten.
 */
export function checkinUnavailableHref(input: CheckinExitInput): NonNullable<ReturnType<typeof checkinContinueHref>> | '/history' {
  return checkinContinueHref(input) ?? '/history';
}
