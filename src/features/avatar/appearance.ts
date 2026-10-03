export const coats = {
  cream: { label: '크림', fur: '#EADCC4', muzzle: '#FFF3DD', accent: '#C7B399' },
  ginger: { label: '치즈', fur: '#C28C53', muzzle: '#F6DFC0', accent: '#855A36' },
  smoke: { label: '그레이', fur: '#889298', muzzle: '#CDD1CC', accent: '#525C62' },
  midnight: { label: '턱시도', fur: '#34383E', muzzle: '#EBE4D8', accent: '#20242A' },
} as const;
export const eyeColors = { sage: { label: '올리브', color: '#92A877' }, amber: { label: '호박', color: '#C79A48' }, blue: { label: '블루', color: '#7DAFB9' } } as const;
export const collars = { none: { label: '없음', color: '#B7987E' }, moss: { label: '세이지', color: '#6F8070' }, clay: { label: '테라코타', color: '#B46F52' } } as const;
export type Appearance = { coat: keyof typeof coats; eyes: keyof typeof eyeColors; collar: keyof typeof collars; build: number; ears: number; turn: number };
export type CatMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy';
export const defaultAppearance: Appearance = { coat: 'cream', eyes: 'sage', collar: 'none', build: 1, ears: 1, turn: 0 };

/** Device-stored customization is untrusted; never pass arbitrary values to the renderer. */
export function parseAppearance(raw: string | null): Appearance {
  try {
    const input: unknown = JSON.parse(raw ?? 'null');
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { ...defaultAppearance };
    const value = input as Record<string, unknown>;
    const member = <T extends string>(key: unknown, options: Record<T, unknown>, fallback: T): T =>
      typeof key === 'string' && Object.hasOwn(options, key) ? key as T : fallback;
    const bounded = (key: unknown, min: number, max: number, fallback: number) => typeof key === 'number' && Number.isFinite(key) ? Math.min(max, Math.max(min, key)) : fallback;
    return {
      coat: member(value.coat, coats, defaultAppearance.coat), eyes: member(value.eyes, eyeColors, defaultAppearance.eyes),
      collar: member(value.collar, collars, defaultAppearance.collar), build: bounded(value.build, 0.85, 1.15, 1),
      ears: bounded(value.ears, 0.85, 1.15, 1), turn: bounded(value.turn, -0.8, 0.8, 0),
    };
  } catch { return { ...defaultAppearance }; }
}
export const studio = {
  background: '#F4F0E8', surface: '#FFFCF6', ink: '#2D322E', muted: '#6B7067',
  border: '#DADBD0', accent: '#566D58', soft: '#E5EBDD', orange: '#C07851',
  stage: '#E7E7DB', error: '#9C3F31',
};

/** SecureStore keys allow only letters, numbers, dots, hyphens and underscores. */
export function appearanceStorageKey(scope: string) {
  return `mew_avatar_v1_${Array.from(scope, ch => ch.codePointAt(0)!.toString(16)).join('_')}`;
}
