import { homeQuickActions } from './homeQuickActions';

const savedCryPlayback = '울음 다시 듣기';

it('keeps three peer home actions with different verbs', () => {
  expect([homeQuickActions.talk.label, homeQuickActions.record.label, homeQuickActions.photo.label]).toEqual(['말 걸기', '울음 녹음', '사진 찍기']);
});

it('names cry capture as recording now, not playback or analysis', () => {
  const text = `${homeQuickActions.record.label} ${homeQuickActions.record.hint}`;
  expect(homeQuickActions.record.label).not.toBe(savedCryPlayback);
  expect(text).not.toMatch(/듣기|재생|분석|번역|%/);
  expect(homeQuickActions.record.label).toMatch(/녹음/);
  expect(homeQuickActions.record.hint).toMatch(/지금/);
  expect(homeQuickActions.record.hint).toMatch(/울음/);
  expect(homeQuickActions.photo.label).toMatch(/찍/);
  expect(homeQuickActions.talk.label).toMatch(/말/);
});
