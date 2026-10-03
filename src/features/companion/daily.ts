import type { CompanionCheckinKind, CompanionPet } from '@findthem/shared';

export const checkinLabels: Record<CompanionCheckinKind, string> = {
  PLAY: '놀아줬어요',
  MEAL: '식사를 챙겼어요',
  NOTE: '메모 남기기',
  CHECKED: '특이사항 없어요',
};
export function resolveSelectedPet(pets: CompanionPet[] | undefined, selectedId: string | null) {
  return pets?.find(pet => pet.id === selectedId) ?? pets?.[0];
}
/** A Korean diary uses KST even when the device is temporarily abroad. */
export function dayKey(value: string | Date) {
  const original = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(original.getTime())) return '';
  const date = new Date(original.getTime() + 9 * 3600000);
  return date.toISOString().slice(0, 10);
}
/** Midnight at the start of this KST calendar day. Same boundary as isToday. */
export function kstDayStartMs(now = new Date()) {
  return new Date(`${dayKey(now)}T00:00:00+09:00`).getTime();
}
export function isToday(value: string, now = new Date()) { return dayKey(value) === dayKey(now); }

/** Same Korean calendar date as the weekly summary (`formatDayKey`). */
export function formatDiaryDay(key: string) {
  const [year, month, day] = key.split('-');
  if (!year || !month || !day) return '';
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

/**
 * Name one cited care record by the KST day it happened.
 * Today stays "오늘 돌봄". Any other readable day uses that diary date, never "오늘".
 * A missing or unreadable time stays "돌봄 기록" so the caregiver is not told it was today.
 */
export function citedCareName(occurredAt: string | null | undefined, now = new Date()) {
  const key = occurredAt ? dayKey(occurredAt) : '';
  if (!key) return '돌봄 기록';
  if (key === dayKey(now)) return '오늘 돌봄';
  const diary = formatDiaryDay(key);
  return diary ? `${diary} 돌봄` : '돌봄 기록';
}

/** First care label only, so a caregiver's own note that repeats the words is left alone. */
export function presentCareMention(text: string | null | undefined, occurredAt: string | null | undefined, now = new Date()) {
  if (!text || !occurredAt) return text ?? null;
  const key = dayKey(occurredAt);
  if (!key) return text;
  const dated = formatDiaryDay(key);
  if (!dated) return text;
  const live = key === dayKey(now) ? '오늘 돌봄' : `${dated} 돌봄`;
  const stale = live === '오늘 돌봄' ? `${dated} 돌봄` : '오늘 돌봄';
  const at = text.indexOf(stale);
  if (at < 0) return text;
  return text.slice(0, at) + live + text.slice(at + stale.length);
}

/** Same wording the demo answer uses when it first cites a care check-in. */
export function citedCheckinQuote(kind: string, note: string | null | undefined) {
  const label = kind in checkinLabels ? checkinLabels[kind as CompanionCheckinKind] : '돌봄 기록';
  const trimmed = note?.trim() ?? '';
  if (trimmed && trimmed !== label) return `“${label}”라고 골랐고, “${trimmed}”라고 적었어요`;
  return `“${label}”라고 남겼어요`;
}

export type CitedCareRecord =
  | { status: 'saved'; occurredAt: string; kind: string; note: string | null }
  | { status: 'gone' };

/** Plain line when the check-in this answer cited is no longer saved. Not a new record. */
export const citedCareGoneText = '인용했던 돌봄 기록은 지금 없어요';

const CITED_CARE_QUOTE = /(?:오늘 돌봄|\d{4}년 \d{1,2}월 \d{1,2}일 돌봄|돌봄 기록)에 “(?:놀아줬어요|식사를 챙겼어요|메모 남기기|특이사항 없어요|돌봄 기록)”라고 (?:골랐고, “[\s\S]*?”라고 적었어요|남겼어요)/;

function citedCareSentence(care: CitedCareRecord, now: Date) {
  return care.status === 'gone'
    ? citedCareGoneText
    : `${citedCareName(care.occurredAt, now)}에 ${citedCheckinQuote(care.kind, care.note)}`;
}

/**
 * Cited care in the same order as this answer’s check-in ids.
 * An id that is not loaded yet stays absent so a later sentence does not move up.
 * No loaded record means the stored answer is left alone.
 */
export function citedCaresForAnswer(
  ids: readonly string[] | null | undefined,
  moments: ReadonlyMap<string, CitedCareRecord>,
): (CitedCareRecord | undefined)[] | undefined {
  if (!ids?.length) return undefined;
  const records = ids.map(id => moments.get(id));
  return records.some(item => item != null) ? records : undefined;
}

/**
 * Every cited care sentence, in check-in order, from the record as it is saved now.
 * One record still rewrites only the first sentence. A deleted check-in drops that quote.
 * A sentence with no loaded record, and anything that is not a cited care sentence, stays.
 */
export function presentCitedCareAnswer(
  text: string | null | undefined,
  care: CitedCareRecord | readonly (CitedCareRecord | undefined)[] | undefined,
  now = new Date(),
) {
  if (!text || !care) return text ?? null;
  const cares = Array.isArray(care) ? care : [care];
  if (!cares.some(item => item != null)) return text;
  const pattern = new RegExp(CITED_CARE_QUOTE.source, 'g');
  const matches = [...text.matchAll(pattern)];
  const first = cares[0];
  if (!matches.length) return first?.status === 'saved' ? presentCareMention(text, first.occurredAt, now) : text;
  let cursor = 0;
  let shown = '';
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index ?? 0;
    shown += text.slice(cursor, start);
    const record = cares[index];
    shown += record ? citedCareSentence(record, now) : match[0];
    cursor = start + match[0].length;
  }
  return shown + text.slice(cursor);
}

export type CitedReactionRecord =
  | { status: 'saved'; action: string; reaction: string }
  | { status: 'gone' };

/** Plain line when the reaction this answer cited is no longer saved. Not a new record. */
export const citedReactionGoneText = '인용했던 반응 기록은 지금 없어요';

const CITED_REACTION_QUOTE = /“[^“”]*” 이후 “[^“”]*”라고 남겼어요/;

type ReactionFeedback = { id?: string; action?: string | null; reaction?: string | null; createdAt?: string | null };

/**
 * Newest saved reaction on one observation.
 * Same order as the home card: createdAt, then id. A missing list is unknown, not deleted.
 * An empty list, or only blank actions and reactions, means the saved reaction is gone.
 */
export function citedReactionFromFeedback(feedback: readonly ReactionFeedback[] | null | undefined): CitedReactionRecord | null {
  if (feedback == null) return null;
  const ranked = feedback.map((item, index) => ({ item, index }));
  ranked.sort((a, b) => {
    const time = (b.item.createdAt ?? '').localeCompare(a.item.createdAt ?? '');
    if (time) return time;
    const id = (b.item.id ?? '').localeCompare(a.item.id ?? '');
    if (id) return id;
    return b.index - a.index;
  });
  for (const { item } of ranked) {
    const action = item.action?.trim() ?? '';
    const reaction = item.reaction?.trim() ?? '';
    if (action && reaction) return { status: 'saved', action, reaction };
  }
  return { status: 'gone' };
}

function citedReactionSentence(reaction: CitedReactionRecord) {
  return reaction.status === 'gone'
    ? citedReactionGoneText
    : `“${reaction.action}” 이후 “${reaction.reaction}”라고 남겼어요`;
}

/**
 * Cited reactions in the same order as this answer’s observation ids.
 * An id that is not loaded yet stays absent so a later sentence does not move up.
 * No loaded record means the stored answer is left alone.
 */
export function citedReactionsForAnswer(
  ids: readonly string[] | null | undefined,
  moments: ReadonlyMap<string, CitedReactionRecord>,
): (CitedReactionRecord | undefined)[] | undefined {
  if (!ids?.length) return undefined;
  const records = ids.map(id => moments.get(id));
  return records.some(item => item != null) ? records : undefined;
}

/**
 * Every cited reaction sentence, in observation order, from the record as it is saved now.
 * One record still rewrites only the first sentence. A deleted observation or reaction drops that quote.
 * A sentence with no loaded record, and anything that is not a cited reaction sentence, stays.
 */
export function presentCitedReactionAnswer(
  text: string | null | undefined,
  reaction: CitedReactionRecord | readonly (CitedReactionRecord | undefined)[] | null | undefined,
) {
  if (!text || !reaction) return text ?? null;
  const reactions = Array.isArray(reaction) ? reaction : [reaction];
  if (!reactions.some(item => item != null)) return text;
  const pattern = new RegExp(CITED_REACTION_QUOTE.source, 'g');
  const matches = [...text.matchAll(pattern)];
  if (!matches.length) return text;
  let cursor = 0;
  let shown = '';
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index ?? 0;
    shown += text.slice(cursor, start);
    const record = reactions[index];
    shown += record ? citedReactionSentence(record) : match[0];
    cursor = start + match[0].length;
  }
  return shown + text.slice(cursor);
}


/** List rows win. A finished list without the observation is gone. A failed extra read stays absent. */
export function resolveCitedReactionMap(input: {
  ids: readonly string[];
  known: ReadonlyMap<string, CitedReactionRecord>;
  loadedIds: ReadonlySet<string>;
  listComplete: boolean;
  extra: readonly { id: string; record: CitedReactionRecord | null }[];
}) {
  const map = new Map(input.known);
  if (input.listComplete) {
    for (const id of input.ids) {
      if (!map.has(id) && !input.loadedIds.has(id)) map.set(id, { status: 'gone' });
    }
  }
  for (const item of input.extra) {
    if (!item.record || map.has(item.id)) continue;
    map.set(item.id, item.record);
  }
  return map;
}

/** Every cited care sentence, then every cited reaction sentence. Other sentences stay. */
export function presentConversationAnswer(
  text: string | null | undefined,
  care: CitedCareRecord | readonly (CitedCareRecord | undefined)[] | undefined,
  reaction: CitedReactionRecord | readonly (CitedReactionRecord | undefined)[] | null | undefined,
  now = new Date(),
) {
  return presentCitedReactionAnswer(presentCitedCareAnswer(text, care, now), reaction);
}

export function homeCitedCheckinLink(occurredAt: string | null | undefined, index: number, now = new Date()) {
  return `참고한 ${citedCareName(occurredAt, now)} ${index + 1} 보기 →`;
}

export function conversationCitedCheckinLink(occurredAt: string | null | undefined, index: number, now = new Date()) {
  const name = citedCareName(occurredAt, now);
  const record = name.endsWith('기록') ? name : `${name} 기록`;
  return `근거가 된 ${record} ${index + 1} 보기 →`;
}
export function recentRecordedDays(values: string[], now = new Date()) {
  const start = new Date(dayKey(now) + 'T00:00:00+09:00').getTime() - 6 * 86400000;
  return new Set(values.filter(value => new Date(value).getTime() >= start && new Date(value) <= now).map(dayKey)).size;
}

/** Newest first. Today follows the KST diary boundary, not the device timezone. */
export function todayCheckins<T extends { petId: string; occurredAt: string }>(items: readonly T[], petId: string | null | undefined, now = new Date()) {
  if (!petId) return [];
  return items.filter(item => item.petId === petId && isToday(item.occurredAt, now)).slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function checkinLabel(kind: string) {
  return kind in checkinLabels ? checkinLabels[kind as CompanionCheckinKind] : '돌봄 기록';
}

/**
 * Plain note when today's care walk stopped before a row from before today.
 * Empty when the list ended or a pre-today row was reached. Same honesty as the weekly page note.
 */
export function todayCareTruncationNote(truncated: boolean) {
  return truncated ? '아직 불러오지 않은 오늘의 나중 기록은 이 카드에 없어요.' : '';
}

/** Home copy for the selected cat's care records. Null means nothing was saved today. */
export function todayCheckinSummary(items: readonly { kind: string; note?: string | null }[]) {
  const latest = items[0];
  if (!latest) return null;
  const note = latest.note?.trim() || '메모 없이 남긴 보호자 기록이에요';
  const others = items.slice(1).map(item => checkinLabel(item.kind));
  const detail = others.length ? `${note} · 다른 기록: ${others.join(', ')}` : note;
  return { title: checkinLabel(latest.kind), detail };
}
