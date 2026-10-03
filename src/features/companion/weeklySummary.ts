import { dayKey } from './daily';

/** Same 7 KST calendar days as the diary streak, including today. */
export const WEEKLY_WINDOW_DAYS = 7;
/** Fewer than two observations cannot support a "frequent situation" claim. */
export const WEEKLY_MIN_OBSERVATIONS = 2;

export type WeeklyTagCount = { tag: string; count: number };
export type WeeklySummary = {
  petId: string;
  startKey: string;
  endKey: string;
  observationCount: number;
  checkinCount: number;
  recordCount: number;
  frequentTags: WeeklyTagCount[];
  feedbackRecorded: boolean;
  feedbackCount: number;
  insufficient: boolean;
  insufficientReason: string | null;
  notice: string;
};

type WeekObservation = { id: string; petId: string; createdAt: string; contextTags: string[] };
type WeekFeedback = { observationId: string };
type WeekCheckin = { petId: string; occurredAt: string };

export function weekWindow(now = new Date()) {
  const endKey = dayKey(now);
  const startMs = new Date(`${endKey}T00:00:00+09:00`).getTime() - (WEEKLY_WINDOW_DAYS - 1) * 86400000;
  return { startMs, nowMs: now.getTime(), startKey: dayKey(new Date(startMs)), endKey };
}

function inWindow(value: string, window: ReturnType<typeof weekWindow>) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= window.startMs && time <= window.nowMs;
}

export function formatDayKey(key: string) {
  const [year, month, day] = key.split('-');
  if (!year || !month || !day) return key;
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

export function summarizeWeek(input: {
  petId: string;
  observations: WeekObservation[];
  feedback: WeekFeedback[];
  checkins: WeekCheckin[];
  now?: Date;
}): WeeklySummary {
  const window = weekWindow(input.now ?? new Date());
  const observations = input.observations.filter(item => item.petId === input.petId && inWindow(item.createdAt, window));
  const checkins = input.checkins.filter(item => item.petId === input.petId && inWindow(item.occurredAt, window));
  const ids = new Set(observations.map(item => item.id));
  const feedbackCount = input.feedback.filter(item => ids.has(item.observationId)).length;
  const counts = new Map<string, number>();
  for (const item of observations) {
    for (const tag of item.contextTags) {
      const label = tag.trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  const frequentTags = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));
  const observationCount = observations.length;
  const checkinCount = checkins.length;
  const recordCount = observationCount + checkinCount;
  let insufficientReason: string | null = null;
  if (observationCount < WEEKLY_MIN_OBSERVATIONS) {
    if (recordCount === 0) insufficientReason = '최근 7일(한국 시간) 동안 이 아이의 사진·울음·영상·돌봄 기록이 없어요. 같은 기간의 관찰이 적어도 두 건 있어야 상황 태그를 모을 수 있어요.';
    else if (observationCount === 0) insufficientReason = `돌봄 기록은 ${checkinCount}건 있지만, 사진·울음·영상 관찰이 없어 자주 남긴 상황을 말하지 않아요.`;
    else insufficientReason = `이 기간의 관찰 기록이 ${observationCount}건뿐이라 자주 나타난 상황이라고 말하기 어려워요. 기록이 적다는 것은 행동이 나아졌다는 뜻이 아니에요.`;
  }
  return {
    petId: input.petId,
    startKey: window.startKey,
    endKey: window.endKey,
    observationCount,
    checkinCount,
    recordCount,
    frequentTags: insufficientReason ? [] : frequentTags,
    feedbackRecorded: feedbackCount > 0,
    feedbackCount,
    insufficient: insufficientReason !== null,
    insufficientReason,
    notice: '이 요약은 이 기기의 기록 건수만 세어요. 실제 AI 분석이 아니에요. 기록을 많이 남겼다고 행동이 나빠진 것은 아니에요.',
  };
}
