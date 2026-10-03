import type { CompanionObservation } from '@findthem/shared';
import { buildDemoObservation, demoInference, groundedDemoReply, initialDemo, changeDemo, getDemo, type FeedbackRecord } from './demo';
import { writeDemo } from '../../core/storage';
jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));
const record = (id: string, petId: string, date: string): CompanionObservation => ({ id, petId, createdAt: date, completedAt: date, kind: 'PHOTO', question: '왜 울까요?', contextTags: [], status: 'ABSTAINED', failureCode: null, media: [], inference: null, feedback: [] });
const feedback = (observationId: string): FeedbackRecord => ({ id: 'feedback', observationId, action: '놀아줬어요', reaction: '장난감을 따라왔어요', note: null, happenedAt: '2026-09-01T12:00:00Z', createdAt: '2026-09-01T12:00:00Z' });

describe('private demo memory', () => {
  it('starts without fabricated observations and with training disabled', () => {
    expect(initialDemo().observations).toEqual([]);
    expect(initialDemo().consent.researchTraining).toBe(false);
  });
  it('does not claim an AI photo result in the local experience', () => {
    const result = demoInference(record('now', 'cat-a', '2026-09-02T00:00:00Z'), [], []);
    expect(result.status).toBe('ABSTAINED');
    expect(result.utterance).toBeNull();
    expect(result.limitations.join(' ')).toContain('실제 AI 분석 결과가 아닙니다');
    expect(result.limitations.join(' ')).toContain('이 기기에만 남아요');
  });
  it('never cites another cat or a future observation', () => {
    const current = record('now', 'cat-a', '2026-09-02T00:00:00Z');
    const records = [record('other-cat', 'cat-b', '2026-09-01T00:00:00Z'), record('future', 'cat-a', '2026-09-03T00:00:00Z')];
    expect(demoInference(current, records, records.map(r => feedback(r.id))).citedObservationIds).toEqual([]);
    expect(groundedDemoReply('cat-c', records, records.map(r => feedback(r.id))).citedObservationIds).toEqual([]);
  });
  it('uses the actual action and reaction with a traceable source', () => {
    const reply = groundedDemoReply('cat-a', [record('prior', 'cat-a', '2026-09-01T00:00:00Z')], [feedback('prior')]);
    expect(reply.citedObservationIds).toEqual(['prior']);
    expect(reply.text).toContain('놀아줬어요');
    expect(reply.text).toContain('장난감을 따라왔어요');
  });
  it('does not publish a change when durable storage fails', async () => {
    await getDemo();
    jest.mocked(writeDemo).mockRejectedValueOnce(new Error('DISK_FULL'));
    await expect(changeDemo(data => { data.pets[0].name = '저장 실패'; })).rejects.toThrow('DISK_FULL');
    expect((await getDemo()).pets[0].name).toBe('모모');
  });
  it('serializes concurrent local writes without losing records', async () => {
    await Promise.all([changeDemo(data => { data.observations.push(record('one', 'cat-a', '2026-09-01T00:00:00Z')); }), changeDemo(data => { data.observations.push(record('two', 'cat-a', '2026-09-02T00:00:00Z')); })]);
    expect((await getDemo()).observations.map(r => r.id)).toEqual(['one', 'two']);
  });
  it('stores a short demo video locally without an AI result or upload', () => {
    const saved = buildDemoObservation({ uri: 'file:///companion-videos/clip.mp4', kind: 'VIDEO', durationMs: 10_000, petId: 'cat-a', question: '', contextTags: ['창가에서'], idempotencyKey: 'video-1' }, [], []);
    expect(saved.kind).toBe('VIDEO');
    expect(saved.localVideoUri).toBe('file:///companion-videos/clip.mp4');
    expect(saved.status).toBe('ABSTAINED');
    expect(saved.inference?.utterance).toBeNull();
    expect(saved.inference?.observation.join(' ')).toContain('영상을 분석하지 않아요');
    expect(saved.media[0]).toMatchObject({ kind: 'VIDEO', durationMs: 10_000, url: '' });
    expect(saved.media[0].url).not.toMatch(/^https?:/);
    expect(() => buildDemoObservation({ uri: 'file:///long.mp4', kind: 'VIDEO', durationMs: 11_001, petId: 'cat-a', question: '', contextTags: [], idempotencyKey: 'video-long' }, [], [])).toThrow('VIDEO_TOO_LONG');
  });
});
