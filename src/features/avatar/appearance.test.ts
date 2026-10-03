import { appearanceStorageKey, defaultAppearance, parseAppearance } from './appearance';

describe('avatar preferences', () => {
  test.each([null, 'broken', '[]', 'null', '42'])('recovers invalid stored data: %s', raw => {
    expect(parseAppearance(raw)).toEqual(defaultAppearance);
  });
  test('rejects prototype names and clamps unsafe geometry values', () => {
    expect(parseAppearance(JSON.stringify({ coat:'__proto__', eyes:'constructor', collar:'toString', build:-500, ears:1e20, turn:100 })))
      .toEqual({ ...defaultAppearance, build:0.85, ears:1.15, turn:0.8 });
  });
  test('preserves supported customization and ignores unknown fields', () => {
    const value = { coat:'smoke', eyes:'blue', collar:'none', build:1.05, ears:0.95, turn:0.32 };
    expect(parseAppearance(JSON.stringify({ ...value, extra:true }))).toEqual(value);
  });
  test('makes native-safe, distinct keys for users, pets and Unicode', () => {
    const keys = ['api:user:모모', 'api:user:나비', 'demo:user:모모', 'api:user:모_모'].map(appearanceStorageKey);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach(key => expect(key).toMatch(/^[a-zA-Z0-9._-]+$/));
  });
});
