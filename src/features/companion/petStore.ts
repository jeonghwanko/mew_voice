import type { CompanionPet } from '@findthem/shared';
import { changeDemo } from './demo';

/** Same choices as registration. A saved sex outside this list is not a diagnosis and is not kept as a new value. */
export const PET_SEX_VALUES = ['모름', '암컷', '수컷'] as const;

const NAME_LIMIT = 50;
const AGE_LIMIT = 40;
const BREED_LIMIT = 50;

export type UpdateDemoPetProfileInput = { name: string; age: string; breed: string; sex: string };

function optionalTrait(value: string, limit: number) {
  const trimmed = value.trim();
  if (trimmed.length > limit) throw new Error('INVALID_PET_PROFILE');
  return trimmed || '모름';
}

function normalize(input: UpdateDemoPetProfileInput) {
  if (typeof input.name !== 'string' || typeof input.age !== 'string' || typeof input.breed !== 'string' || typeof input.sex !== 'string') throw new Error('INVALID_PET_PROFILE');
  const name = input.name.trim();
  if (!name || name.length > NAME_LIMIT) throw new Error('INVALID_PET_PROFILE');
  if (!PET_SEX_VALUES.includes(input.sex as typeof PET_SEX_VALUES[number])) throw new Error('INVALID_PET_PROFILE');
  return { name, age: optionalTrait(input.age, AGE_LIMIT), breed: optionalTrait(input.breed, BREED_LIMIT), sex: input.sex };
}

/**
 * Correct one cat's name and the age, breed, and sex the caregiver already knows.
 * Observations, reactions, care, and conversations stay on the same cat.
 * This does not diagnose health or breed, and it does not rewrite stored conversation text.
 */
export async function updateDemoPetProfile(id: string, input: UpdateDemoPetProfileInput): Promise<CompanionPet> {
  return changeDemo(data => {
    const index = data.pets.findIndex(item => item.id === id);
    if (index < 0) throw new Error('NOT_FOUND');
    const current = data.pets[index];
    const normalized = normalize(input);
    const source = typeof current.confirmedTraits.source === 'string' && current.confirmedTraits.source.trim() ? current.confirmedTraits.source : 'guardian';
    const updated: CompanionPet = {
      ...current,
      name: normalized.name,
      confirmedTraits: { ...current.confirmedTraits, age: normalized.age, breed: normalized.breed, sex: normalized.sex, source },
      updatedAt: new Date().toISOString(),
    };
    data.pets[index] = updated;
    return updated;
  });
}
