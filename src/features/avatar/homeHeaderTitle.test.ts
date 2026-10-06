import { HOME_HEADER_EMPTY, HOME_HEADER_LOADING, homeHeaderTitle } from './homeHeaderTitle';

it('does not show the empty label while the selected cat is unknown', () => {
  expect(homeHeaderTitle({ loading: true })).toBe(HOME_HEADER_LOADING);
  expect(homeHeaderTitle({ loading: true })).not.toBe(HOME_HEADER_EMPTY);
});

it('keeps the last known selected name while loading again', () => {
  expect(homeHeaderTitle({ loading: true, lastKnownName: '모모' })).toBe('모모');
});

it('names the selected cat once known', () => {
  expect(homeHeaderTitle({ petName: '모모', loading: false, lastKnownName: '나비' })).toBe('모모');
});

it('keeps the existing empty label when no cat exists after load', () => {
  expect(homeHeaderTitle({ loading: false })).toBe(HOME_HEADER_EMPTY);
  expect(homeHeaderTitle({ loading: false, lastKnownName: '모모' })).toBe(HOME_HEADER_EMPTY);
});

it('keeps the loading line short and free of health or translation claims', () => {
  expect(HOME_HEADER_LOADING.length).toBeLessThanOrEqual(14);
  expect(HOME_HEADER_LOADING).not.toMatch(/알아듣|번역|진단|건강|%/);
});
