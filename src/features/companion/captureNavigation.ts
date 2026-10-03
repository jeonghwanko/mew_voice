import { homeQuestionHref } from './homeConversation';
import { observationExitHref, type ObservationExitInput } from './observationNavigation';

/** Photo, cry, or short video chosen on the capture screen. */
export type CaptureMode = 'photo' | 'audio' | 'video';

function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = raw?.trim();
  return text || undefined;
}

/**
 * New photo, cry, or short video started from home.
 * returnTo=home carries no conversation id, so the stored thread is not rewritten.
 */
export function homeCaptureHref(mode?: CaptureMode) {
  const kind = mode === 'photo' || mode === 'audio' || mode === 'video' ? mode : undefined;
  return kind ? `/capture?mode=${kind}&returnTo=home` : '/capture?returnTo=home';
}

/**
 * Home capture returns to that home route.
 * Diary, the record list, and a conversation open are not this path.
 */
export function captureHomeHref(input: ObservationExitInput): '/' | ReturnType<typeof homeQuestionHref> | null {
  if (firstParam(input.returnTo) !== 'home') return null;
  const next = observationExitHref(input);
  if (next === '/' || (typeof next === 'object' && next !== null && next.pathname === '/')) return next;
  return '/';
}

/**
 * After a new photo, cry, or video is saved.
 * Home returns home. Diary and the record list still open the new observation.
 * Replacing media is not this path.
 */
export function captureSavedHref(observationId: string, input: ObservationExitInput): '/' | `/history` | `/observations/${string}` | ReturnType<typeof homeQuestionHref> {
  const home = captureHomeHref(input);
  if (home) return home;
  const id = observationId.trim();
  if (!id) return '/history';
  return `/observations/${encodeURIComponent(id)}`;
}

/**
 * Leaving a new capture without saving.
 * Home returns home. Diary and the record list stay on the previous screen.
 */
export function captureLeaveHref(input: ObservationExitInput) {
  return captureHomeHref(input);
}

/**
 * After replacing media, return to that same observation and keep its return path.
 * returnTo=home stays on the observation. It is not rewritten to home here.
 * A blank id stays on the record list.
 */
export function replacedCaptureHref(observationId: string, input: ObservationExitInput) {
  const id = observationId.trim();
  if (!id) return '/history';
  const returnTo = firstParam(input.returnTo);
  const conversationId = firstParam(input.conversationId);
  const petId = firstParam(input.petId);
  const query: string[] = [];
  if (returnTo) query.push(`returnTo=${encodeURIComponent(returnTo)}`);
  if (conversationId) query.push(`conversationId=${encodeURIComponent(conversationId)}`);
  if (petId) query.push(`petId=${encodeURIComponent(petId)}`);
  const path = `/observations/${encodeURIComponent(id)}`;
  return query.length ? `${path}?${query.join('&')}` : path;
}
