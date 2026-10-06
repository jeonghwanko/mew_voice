/** Empty register CTA after pets finish loading with none selected. */
export const HOME_REGISTER_CTA = '우리 아이 등록하기';
/** Confirming line while the pet list or selection is still unknown. Not an invitation to register. */
export const HOME_REGISTER_LOADING = '아이를 확인하고 있어요';

/**
 * Home chat composer / empty CTA: do not invite registration while pets are still loading.
 * With a pet → ready for the normal input row. Loading → confirming line. Loaded empty → register.
 */
export function homeRegisterCta(input: { hasPet: boolean; loading: boolean }): 'input' | 'loading' | 'register' {
  if (input.hasPet) return 'input';
  if (input.loading) return 'loading';
  return 'register';
}
