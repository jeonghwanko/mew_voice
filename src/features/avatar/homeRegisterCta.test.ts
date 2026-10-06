import { HOME_REGISTER_CTA, HOME_REGISTER_LOADING, homeRegisterCta } from './homeRegisterCta';

it('does not invite registration while pets are still loading', () => {
  expect(homeRegisterCta({ hasPet: false, loading: true })).toBe('loading');
  expect(homeRegisterCta({ hasPet: false, loading: true })).not.toBe('register');
});

it('keeps the register CTA once load finishes with no pet', () => {
  expect(homeRegisterCta({ hasPet: false, loading: false })).toBe('register');
});

it('uses the normal input row once a pet is selected', () => {
  expect(homeRegisterCta({ hasPet: true, loading: false })).toBe('input');
  expect(homeRegisterCta({ hasPet: true, loading: true })).toBe('input');
});

it('keeps the loading line short and free of health or translation claims', () => {
  expect(HOME_REGISTER_LOADING.length).toBeLessThanOrEqual(14);
  expect(HOME_REGISTER_LOADING).not.toMatch(/알아듣|번역|진단|건강|%/);
  expect(HOME_REGISTER_CTA).toBe('우리 아이 등록하기');
  expect(HOME_REGISTER_CTA).not.toMatch(/알아듣|번역|진단|건강|%/);
});
