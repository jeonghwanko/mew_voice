import type { CompanionPet } from '@findthem/shared';
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
export function isToday(value: string, now = new Date()) { return dayKey(value) === dayKey(now); }
export function recentRecordedDays(values: string[], now = new Date()) {
  const start = new Date(dayKey(now) + 'T00:00:00+09:00').getTime() - 6 * 86400000;
  return new Set(values.filter(value => new Date(value).getTime() >= start && new Date(value) <= now).map(dayKey)).size;
}
