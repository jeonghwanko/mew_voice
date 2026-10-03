import { describe, expect, it } from 'vitest';
import {
  diffCoffeeBenefitSnapshots,
  normalizeCoffeeBrand,
  parseCoffeeBenefitSnapshot,
  parseCoffeeOrganicPreferences,
} from './utils.js';

describe('coffee organic helpers', () => {
  it('운영 브랜드 표기를 공통 key로 정규화한다', () => {
    expect(normalizeCoffeeBrand('스타벅스 강남점')).toBe('starbucks');
    expect(normalizeCoffeeBrand('메가MGC커피 관악점')).toBe('mega');
    expect(normalizeCoffeeBrand('The Coffee Bean')).toBe('coffeebean');
    expect(normalizeCoffeeBrand('동네 개인카페')).toBeNull();
  });

  it('저장 조건의 version과 TTL을 검증한다', () => {
    const now = Date.parse('2026-08-10T00:00:00.000Z');
    const valid = {
      version: 1,
      purpose: 'work',
      telecoms: ['telecom_kt', 'unknown'],
      cards: [],
      preferredBrands: ['mega'],
      savedAt: '2026-08-01T00:00:00.000Z',
      lastUsedAt: '2026-08-09T00:00:00.000Z',
    };
    expect(parseCoffeeOrganicPreferences(valid, now)).toMatchObject({
      purpose: 'work', telecoms: ['telecom_kt'], preferredBrands: ['mega'],
    });
    expect(parseCoffeeOrganicPreferences({ ...valid, version: 2 }, now)).toBeNull();
    expect(parseCoffeeOrganicPreferences({ ...valid, lastUsedAt: '2025-01-01T00:00:00.000Z' }, now)).toBeNull();
  });

  it('혜택 snapshot 신규·수정·종료를 구분한다', () => {
    const previous = parseCoffeeBenefitSnapshot({
      version: 1,
      capturedAt: '2026-08-01T00:00:00.000Z',
      items: [
        { id: 'same', updatedAt: '2026-08-01T00:00:00.000Z', status: 'active', endDate: null },
        { id: 'updated', updatedAt: '2026-08-01T00:00:00.000Z', status: 'active', endDate: null },
        { id: 'expired', updatedAt: '2026-08-01T00:00:00.000Z', status: 'active', endDate: null },
      ],
    });
    const current = parseCoffeeBenefitSnapshot({
      version: 1,
      capturedAt: '2026-08-10T00:00:00.000Z',
      items: [
        { id: 'same', updatedAt: '2026-08-01T00:00:00.000Z', status: 'active', endDate: null },
        { id: 'updated', updatedAt: '2026-08-09T00:00:00.000Z', status: 'active', endDate: null },
        { id: 'new', updatedAt: '2026-08-10T00:00:00.000Z', status: 'active', endDate: null },
      ],
    });
    expect(previous).not.toBeNull();
    expect(current).not.toBeNull();
    expect(diffCoffeeBenefitSnapshots(previous, current!)).toEqual([
      { type: 'updated', item: current!.items[1] },
      { type: 'new', item: current!.items[2] },
      { type: 'expired', item: previous!.items[2] },
    ]);
  });
});
