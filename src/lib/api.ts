import Constants from 'expo-constants';
import { sessionStorage } from '../core/storage';

export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
export class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await sessionStorage.get('ft_token');
  const appKey = Constants.expoConfig?.extra?.appKey as string | undefined;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(appKey ? { 'x-app-key': appKey } : {}) };
}
export async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal, headers?: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 45_000);
  try {
    const form = body instanceof FormData;
    const response = await fetch(`${API_BASE}${path}`, { method, signal: controller.signal, headers: { ...(await authHeaders()), ...(!form && body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : form ? body : JSON.stringify(body) });
    if (!response.ok) { const error = await response.json().catch(() => ({})) as { error?: string }; throw new ApiError(response.status, error.error ?? 'REQUEST_FAILED'); }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export const api = { get: <T>(path: string, signal?: AbortSignal) => request<T>(path, 'GET', undefined, signal), post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body), patch: <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body), delete: <T>(path: string) => request<T>(path, 'DELETE') };
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return '입력한 내용과 발생 시각을 확인해 주세요. 미래 시각은 5분 이내만 저장할 수 있어요.';
    if (error.status === 409) return '기록이 변경되었거나 같은 요청으로 다른 내용을 보냈어요. 최신 기록을 확인해 주세요.';
    if (error.status === 401) return '로그인이 만료됐어요. 설정에서 다시 로그인해 주세요.';
    if (error.status === 403) return '이 기록에 접근할 수 없어요. 동의와 계정을 확인해 주세요.';
    if (error.status === 404) return '기록을 찾을 수 없어요. 삭제되었거나 현재 계정에서 볼 수 없는 기록이에요.';
    if (error.status === 429) return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
    if (error.status === 413) return '사진이 너무 커요. 다른 사진을 선택해 주세요.';
  }
  if (error instanceof Error && ['INVALID_CHECKIN', 'INVALID_CHECKIN_TIME'].includes(error.message)) return '메모 내용과 발생 시각을 확인해 주세요.';
  if (error instanceof Error && error.message === 'INVALID_FEEDBACK') return '해 본 행동과 이후 반응을 확인해 주세요.';
  if (error instanceof Error && error.message === 'INVALID_OBSERVATION_CAPTION') return '질문과 상황 태그를 확인해 주세요.';
  if (error instanceof Error && error.message === 'INVALID_PET_PROFILE') return '이름과 알고 있는 나이·품종·성별을 확인해 주세요.';
  if (error instanceof Error && error.message === 'PET_PROFILE_ACCOUNT_READONLY') return '이 계정에 등록한 아이 정보는 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'REACTION_ACCOUNT_READONLY') return '계정에 남긴 반응은 아직 고치거나 지울 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'OBSERVATION_ACCOUNT_READONLY') return '이 계정에 남긴 관찰은 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.';
  if (error instanceof Error && error.message === 'OBSERVATION_CAPTION_ACCOUNT_READONLY') return '이 계정에 남긴 질문과 상황 태그는 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'INVALID_OBSERVATION_MEDIA') return '같은 종류의 사진·울음·영상만 바꿀 수 있어요.';
  if (error instanceof Error && error.message === 'OBSERVATION_MEDIA_ACCOUNT_READONLY') return '이 계정에 남긴 사진·울음·영상은 여기서 바꿀 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'INVALID_OBSERVATION_PET') return '옮길 아이를 확인해 주세요.';
  if (error instanceof Error && error.message === 'OBSERVATION_PET_ACCOUNT_READONLY') return '이 계정에 남긴 관찰은 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'INVALID_CHECKIN_PET') return '옮길 아이를 확인해 주세요.';
  if (error instanceof Error && error.message === 'CHECKIN_PET_ACCOUNT_READONLY') return '이 계정에 남긴 돌봄 기록은 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'CONVERSATION_ACCOUNT_READONLY') return '이 계정에 남긴 대화는 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.';
  if (error instanceof Error && error.message === 'INVALID_CONVERSATION_QUESTION') return '질문 문장을 확인해 주세요.';
  if (error instanceof Error && error.message === 'CONVERSATION_QUESTION_ACCOUNT_READONLY') return '이 계정에 남긴 대화의 질문은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'INVALID_CONVERSATION_PET') return '옮길 아이를 확인해 주세요.';
  if (error instanceof Error && error.message === 'CONVERSATION_PET_ACCOUNT_READONLY') return '이 계정에 남긴 대화는 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.';
  if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') return '저장 여부를 기록 목록에서 확인한 뒤 새 기록으로 작성해 주세요.';
  if (error instanceof Error && error.message === 'EDIT_CONFLICT') return '기록이 변경되었어요. 최신 기록을 다시 불러와 주세요.';
  if (error instanceof Error && error.message === 'NOT_FOUND') return '기록을 찾을 수 없어요.';
  if (error instanceof Error && error.message === 'CONSENT_REQUIRED') return '설정에서 기록 보관 동의를 확인해 주세요.';
  if (error instanceof Error && error.message === 'VIDEO_TOO_LONG') return '영상은 약 10초까지 남길 수 있어요. 더 짧은 영상을 선택해 주세요.';
  if (error instanceof Error && error.message === 'AUDIO_TOO_LONG') return '울음은 45초까지 남길 수 있어요. 더 짧게 다시 녹음해 주세요.';
  if (error instanceof Error && error.message === 'AUDIO_RECORDING_FAILED') return '울음을 저장하지 못했어요. 다시 녹음해 주세요.';
  if (error instanceof Error && error.message === 'VIDEO_LOCAL_ONLY') return '영상은 아직 서버로 보내지 않아요. 체험 모드에서 이 기기에만 저장할 수 있어요.';
  if (error instanceof Error && error.name === 'AbortError') return '연결이 오래 걸려 중단했어요. 저장 여부를 확인한 뒤 다시 시도해 주세요.';
  return '연결을 확인하고 다시 시도해 주세요. 입력한 내용은 이 화면에 남아 있어요.';
}
