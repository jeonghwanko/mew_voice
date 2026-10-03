import { summarizeWeek } from './weeklySummary';

const now = new Date('2026-10-03T02:00:00Z');
const observation = (id: string, petId: string, createdAt: string, tags: string[] = []) => ({ id, petId, createdAt, contextTags: tags });
const feedback = (observationId: string) => ({ observationId });
const checkin = (petId: string, occurredAt: string) => ({ petId, occurredAt });

describe('weekly summary', () => {
  it('counts only the selected cat inside the last 7 KST days', () => {
    const summary = summarizeWeek({
      petId: 'cat-a', now,
      observations: [
        observation('edge', 'cat-a', '2026-09-26T15:00:00.000Z', ['창가에서']),
        observation('today', 'cat-a', '2026-10-03T01:00:00.000Z', ['창가에서', '놀이 중']),
        observation('old', 'cat-a', '2026-09-26T14:59:59.000Z', ['식사 전']),
        observation('future', 'cat-a', '2026-10-03T03:00:00.000Z', ['귀가 후']),
        observation('other', 'cat-b', '2026-10-02T00:00:00.000Z', ['낯선 소리']),
      ],
      feedback: [feedback('today'), feedback('other'), feedback('old')],
      checkins: [checkin('cat-a', '2026-10-01T00:00:00.000Z'), checkin('cat-b', '2026-10-01T00:00:00.000Z'), checkin('cat-a', '2026-09-01T00:00:00.000Z')],
    });
    expect(summary.startKey).toBe('2026-09-27');
    expect(summary.endKey).toBe('2026-10-03');
    expect(summary.observationCount).toBe(2);
    expect(summary.checkinCount).toBe(1);
    expect(summary.recordCount).toBe(3);
    expect(summary.insufficient).toBe(false);
    expect(summary.frequentTags).toEqual([{ tag: '창가에서', count: 2 }, { tag: '놀이 중', count: 1 }]);
    expect(summary.feedbackRecorded).toBe(true);
    expect(summary.feedbackCount).toBe(1);
    expect(summary.notice).toContain('나빠진 것은 아니에요');
    expect(JSON.stringify(summary)).not.toContain('악화');
    expect(summary).not.toHaveProperty('score');
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
