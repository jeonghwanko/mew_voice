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
