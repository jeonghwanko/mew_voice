/** Header line while the pet list or saved selection is still in flight. Not a cat's name. */
export const HOME_HEADER_LOADING = '아이를 확인하고 있어요';
/** Label the header already used when no cat is selected after load. */
export const HOME_HEADER_EMPTY = '나의 고양이';

/** The home header names the selected cat. Before that is known it keeps the last known name or says it is still checking, never the empty label. */
export function homeHeaderTitle(input: { petName?: string | null; loading: boolean; lastKnownName?: string | null }) {
  if (input.petName) return input.petName;
  if (input.loading) return input.lastKnownName || HOME_HEADER_LOADING;
  return HOME_HEADER_EMPTY;
}
