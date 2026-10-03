import { summarizeWeek, weeklyObservationKinds } from './weeklySummary';

const now = new Date('2026-10-03T02:00:00Z');
const observation = (id: string, petId: string, createdAt: string, tags: string[] = [], kind: 'PHOTO' | 'AUDIO' | 'VIDEO' = 'PHOTO') => ({ id, petId, createdAt, contextTags: tags, kind });
const feedback = (observationId: string) => ({ observationId });
const checkin = (petId: string, occurredAt: string) => ({ petId, occurredAt });

describe('weekly summary', () => {
  it('counts only the selected cat inside the last 7 KST days', () => {
    const summary = summarizeWeek({
      petId: 'cat-a', now, demo: true,
      observations: [
        observation('edge', 'cat-a', '2026-09-26T15:00:00.000Z', ['창가에서'], 'PHOTO'),
        observation('today', 'cat-a', '2026-10-03T01:00:00.000Z', ['창가에서', '놀이 중'], 'AUDIO'),
        observation('old', 'cat-a', '2026-09-26T14:59:59.000Z', ['식사 전'], 'VIDEO'),
        observation('future', 'cat-a', '2026-10-03T03:00:00.000Z', ['귀가 후'], 'PHOTO'),
        observation('other', 'cat-b', '2026-10-02T00:00:00.000Z', ['낯선 소리'], 'PHOTO'),
      ],
      feedback: [feedback('today'), feedback('other'), feedback('old')],
      checkins: [checkin('cat-a', '2026-10-01T00:00:00.000Z'), checkin('cat-b', '2026-10-01T00:00:00.000Z'), checkin('cat-a', '2026-09-01T00:00:00.000Z')],
    });
    expect(summary.startKey).toBe('2026-09-27');
    expect(summary.endKey).toBe('2026-10-03');
    expect(summary.observationCount).toBe(2);
    expect(summary.photoCount).toBe(1);
    expect(summary.audioCount).toBe(1);
    expect(summary.videoCount).toBe(0);
    expect(summary.checkinCount).toBe(1);
    expect(summary.recordCount).toBe(3);
    expect(summary.insufficient).toBe(false);
    expect(summary.frequentTags).toEqual([{ tag: '창가에서', count: 2 }, { tag: '놀이 중', count: 1 }]);
    expect(summary.feedbackRecorded).toBe(true);
    expect(summary.feedbackCount).toBe(1);
    expect(summary.notice).toContain('나빠진 것은 아니에요');
    expect(summary.notice).toContain('이 기기');
    expect(JSON.stringify(summary)).not.toContain('악화');
    expect(summary).not.toHaveProperty('score');
  });

  it('includes photo, meow, and video observations already stored for the cat', () => {
    const summary = summarizeWeek({
      petId: 'cat-a', now, demo: true,
      observations: [
        observation('photo', 'cat-a', '2026-10-02T00:00:00.000Z', ['창가에서'], 'PHOTO'),
        observation('meow', 'cat-a', '2026-10-02T01:00:00.000Z', ['놀이 중'], 'AUDIO'),
        observation('clip', 'cat-a', '2026-10-02T02:00:00.000Z', [], 'VIDEO'),
      ],
      feedback: [],
      checkins: [checkin('cat-a', '2026-10-01T00:00:00.000Z')],
    });
    expect(summary.observationCount).toBe(3);
    expect(summary.photoCount).toBe(1);
    expect(summary.audioCount).toBe(1);
    expect(summary.videoCount).toBe(1);
    expect(summary.checkinCount).toBe(1);
    expect(summary.recordCount).toBe(4);
    expect(summary.kindCounts.find(item => item.kind === 'VIDEO')).toEqual({ kind: 'VIDEO', label: '영상', count: 1, unavailableReason: null });
    expect(summary.insufficient).toBe(false);
  });

  it('says plainly when account mode has no video observation payload', () => {
    expect(weeklyObservationKinds(false)).toEqual(['PHOTO', 'AUDIO']);
    const summary = summarizeWeek({
      petId: 'cat-a', now, demo: false,
      observationKinds: weeklyObservationKinds(false),
      observations: [
        observation('photo', 'cat-a', '2026-10-02T00:00:00.000Z', ['창가에서'], 'PHOTO'),
        observation('meow', 'cat-a', '2026-10-02T01:00:00.000Z', ['놀이 중'], 'AUDIO'),
      ],
      feedback: [],
      checkins: [],
      truncated: true,
    });
    expect(summary.videoCount).toBeNull();
    expect(summary.kindCounts.find(item => item.kind === 'VIDEO')?.count).toBeNull();
    expect(summary.kindCounts.find(item => item.kind === 'VIDEO')?.unavailableReason).toContain('영상이 포함되지 않아요');
    expect(summary.notice).toContain('이미 불러온');
    expect(summary.notice).toContain('주간 요약 API는 없고');
    expect(summary.notice).toContain('이전 페이지는 세지 않아요');
    expect(summary.notice).not.toMatch(/\d+\s*%/);
    expect(summary.notice).not.toContain('번역');
  });

  it('explains when there is not enough data', () => {
    const empty = summarizeWeek({ petId: 'cat-a', now, observations: [], feedback: [], checkins: [] });
    expect(empty.insufficient).toBe(true);
    expect(empty.insufficientReason).toContain('기록이 없어요');
    expect(empty.frequentTags).toEqual([]);
    const one = summarizeWeek({ petId: 'cat-a', now, observations: [observation('only', 'cat-a', '2026-10-02T00:00:00.000Z', ['창가에서'])], feedback: [], checkins: [] });
    expect(one.insufficient).toBe(true);
    expect(one.insufficientReason).toContain('1건');
    expect(one.frequentTags).toEqual([]);
    expect(one.feedbackRecorded).toBe(false);
  });
});
