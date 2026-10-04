/** Newest saved photo, cry, or short video for the cat selected on the home. */

export const HOME_OBSERVATION_EMPTY = '아직 남긴 사진·울음·영상이 없어요. 사진 찍기나 울음 녹음으로 남겨 둘 수 있어요.';

const KIND_LABEL: Record<string, string> = {
  PHOTO: '사진 관찰',
  AUDIO: '울음 관찰',
  VIDEO: '짧은 영상',
};

export function observationKindLabel(kind: string) {
  return KIND_LABEL[kind] ?? '관찰';
}

/** Demo media is stored, not interpreted. Live audio and video stay unanalyzed too. */
export function observationHonesty(kind: string, demo: boolean) {
  if (demo) return '체험으로 남긴 기록이에요. AI로 분석하지 않았어요.';
  if (kind === 'AUDIO') return '이 녹음은 AI로 분석하지 않았어요.';
  if (kind === 'VIDEO') return '이 영상은 AI로 분석하지 않았어요.';
  return null;
}

/** Seoul wall clock, independent of the device timezone. */
export function seoulTimeLabel(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const shifted = new Date(time + 9 * 60 * 60 * 1000);
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = String(shifted.getUTCMinutes()).padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 || 12;
  return `${month}월 ${day}일 ${period} ${hour12}:${minute}`;
}

type HomeFeedback = { id?: string; action?: string | null; reaction?: string | null; createdAt?: string };

export type HomeObservationItem = {
  id: string;
  petId: string;
  kind: string;
  createdAt: string;
  feedback?: readonly HomeFeedback[] | null;
};

export type HomeObservationSummary = {
  id: string;
  kindLabel: string;
  timeLabel: string;
  honesty: string | null;
  reaction: string | null;
};

function savedReaction(feedback: readonly HomeFeedback[] | null | undefined) {
  if (!feedback?.length) return null;
  const ranked = feedback.map((item, index) => ({ item, index }));
  ranked.sort((a, b) => {
    const time = (b.item.createdAt ?? '').localeCompare(a.item.createdAt ?? '');
    if (time) return time;
    const id = (b.item.id ?? '').localeCompare(a.item.id ?? '');
    if (id) return id;
    return b.index - a.index;
  });
  const chosen = ranked[0].item;
  const action = chosen.action?.trim() ?? '';
  const reaction = chosen.reaction?.trim() ?? '';
  if (action && reaction) return `${action} → ${reaction}`;
  return reaction || action || null;
}

function createdAtRank(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

/** Latest loaded observation for this cat. Does not invent a score or an analysis. */
export function homeObservationSummary(items: readonly HomeObservationItem[], petId: string | null | undefined, demo: boolean): HomeObservationSummary | null {
  if (!petId) return null;
  const owned = items.filter(item => item.petId === petId);
  if (!owned.length) return null;
  const latest = owned.slice().sort((a, b) => createdAtRank(b.createdAt) - createdAtRank(a.createdAt) || b.id.localeCompare(a.id))[0];
  return {
    id: latest.id,
    kindLabel: observationKindLabel(latest.kind),
    timeLabel: seoulTimeLabel(latest.createdAt),
    honesty: observationHonesty(latest.kind, demo),
    reaction: savedReaction(latest.feedback),
  };
}
