import type { CompanionCheckin, CreateCompanionCheckinInput, UpdateCompanionCheckinInput } from '@findthem/shared';
import { changeDemo } from './demo';

function normalize(input: { kind: string; note?: string | null; occurredAt: string }) {
  const note = input.note?.trim() || null;
  if (!['PLAY', 'MEAL', 'NOTE', 'CHECKED'].includes(input.kind) || (input.kind === 'NOTE' && !note) || (note?.length ?? 0) > 500) throw new Error('INVALID_CHECKIN');
  const date = new Date(input.occurredAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 300000) throw new Error('INVALID_CHECKIN_TIME');
  return { kind: input.kind as CompanionCheckin['kind'], note, occurredAt: date.toISOString() };
}

export async function saveDemoCheckin(input: CreateCompanionCheckinInput) {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    if (!data.pets.some(pet => pet.id === input.petId)) throw new Error('NOT_FOUND');
    const normalized = normalize(input);
    const fingerprint = JSON.stringify({ petId: input.petId, ...normalized });
    const previous = data.checkinRequests[input.idempotencyKey];
    if (previous) {
      if (previous !== fingerprint) throw new Error('IDEMPOTENCY_CONFLICT');
      const existing = data.checkins.find(item => item.id === input.idempotencyKey);
      if (!existing) throw new Error('NOT_FOUND');
      return existing;
    }
    const now = new Date().toISOString();
    const record: CompanionCheckin = { id: input.idempotencyKey, petId: input.petId, ...normalized, version: 1, createdAt: now, updatedAt: now };
    data.checkins.push(record); data.checkinRequests[input.idempotencyKey] = fingerprint;
    return record;
  });
}

export async function updateDemoCheckin(id: string, input: UpdateCompanionCheckinInput) {
  return changeDemo(data => {
    if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
    const index = data.checkins.findIndex(item => item.id === id);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.checkins[index];
    if (!data.pets.some(pet => pet.id === current.petId)) throw new Error('NOT_FOUND');
    if (current.version !== input.version) throw new Error('EDIT_CONFLICT');
    const normalized = normalize({ ...current, ...input });
    const updated = { ...current, ...normalized, version: current.version + 1, updatedAt: new Date().toISOString() };
    data.checkins[index] = updated;
    return updated;
  });
}

export async function deleteDemoCheckin(id: string, version: number) {
  return changeDemo(data => {
    const existing = data.checkins.find(item => item.id === id);
    if (!existing) return;
    if (existing.version !== version) throw new Error('EDIT_CONFLICT');
    data.checkins = data.checkins.filter(item => item.id !== id);
  });
}
