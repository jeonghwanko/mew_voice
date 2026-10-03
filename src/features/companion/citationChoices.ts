import type { CompanionCheckinKind } from '@findthem/shared';
import { checkinLabels, dayKey, formatDiaryDay } from './daily';

export type ObservationChoice = { id: string; petId: string; question: string | null; kind: string; createdAt: string };
export type CheckinChoice = { id: string; petId: string; kind: string; note: string | null; occurredAt: string };

/** Newest first. Same order as the reaction move list. */
export function recentChoices<T extends { id: string }>(items: readonly T[], time: (item: T) => string) {
  return [...items].sort((a, b) => time(b).localeCompare(time(a)) || b.id.localeCompare(a.id));
}

/** Another saved record. The one this citation already points at is not a choice. */
export function hasOtherChoice<T extends { id: string }>(items: readonly T[] | null | undefined, currentId: string) {
  return !!items?.some(item => item.id !== currentId);
}

export function petsWithOtherChoice<T extends { id: string; petId: string }>(items: readonly T[], currentId: string, pets: readonly { id: string; name: string }[]) {
  return pets.filter(pet => items.some(item => item.petId === pet.id && item.id !== currentId));
}

export function choicesForPet<T extends { id: string; petId: string }>(items: readonly T[], petId: string, currentId: string) {
  return items.filter(item => item.petId === petId && item.id !== currentId);
}

export function observationChoiceLabel(item: ObservationChoice, peers: readonly ObservationChoice[]) {
  const kind = item.kind === 'AUDIO' ? '울음' : item.kind === 'VIDEO' ? '영상' : '사진';
  const name = item.question?.trim() || '질문 없는 관찰';
  const base = `${kind} · ${name}`;
  const duplicate = peers.filter(peer => {
    const peerKind = peer.kind === 'AUDIO' ? '울음' : peer.kind === 'VIDEO' ? '영상' : '사진';
    return peerKind === kind && (peer.question?.trim() || '질문 없는 관찰') === name;
  }).length > 1;
  const diary = formatDiaryDay(dayKey(item.createdAt));
  return duplicate && diary ? `${base} · ${diary}` : base;
}

export function checkinChoiceLabel(item: CheckinChoice, peers: readonly CheckinChoice[]) {
  const base = checkinBase(item);
  const duplicate = peers.filter(peer => checkinBase(peer) === base).length > 1;
  const diary = formatDiaryDay(dayKey(item.occurredAt));
  return duplicate && diary ? `${base} · ${diary}` : base;
}

function checkinBase(item: { kind: string; note: string | null }) {
  const label = item.kind in checkinLabels ? checkinLabels[item.kind as CompanionCheckinKind] : '돌봄 기록';
  const note = item.note?.trim();
  return note && note !== label ? `${label} · ${note}` : label;
}

export function initialCitationChoice<T extends { id: string; petId: string }>(records: readonly T[], currentId: string, pets: readonly { id: string; name: string }[], time: (item: T) => string) {
  const pet = petsWithOtherChoice(records, currentId, pets)[0];
  if (!pet) return null;
  const first = recentChoices(choicesForPet(records, pet.id, currentId), time)[0];
  if (!first) return null;
  return { petId: pet.id, targetId: first.id };
}

export function firstChoiceOnPet<T extends { id: string; petId: string }>(records: readonly T[], currentId: string, petId: string, time: (item: T) => string) {
  return recentChoices(choicesForPet(records, petId, currentId), time)[0]?.id ?? '';
}
