import type { CompanionObservation } from '@findthem/shared';
import { buildDemoObservation, clearDemoMemory, demoFromStorage, demoInference, groundedDemoReply, initialDemo, changeDemo, getDemo, saveDemoConversation, type FeedbackRecord } from './demo';
import { readDemo, writeDemo } from '../../core/storage';
jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));
const record = (id: string, petId: string, date: string): CompanionObservation => ({ id, petId, createdAt: date, completedAt: date, kind: 'PHOTO', question: '왜 울까요?', contextTags: [], status: 'ABSTAINED', failureCode: null, media: [], inference: null, feedback: [] });
const feedback = (observationId: string): FeedbackRecord => ({ id: 'feedback', observationId, action: '놀아줬어요', reaction: '장난감을 따라왔어요', note: null, happenedAt: '2026-09-01T12:00:00Z', createdAt: '2026-09-01T12:00:00Z' });

describe('private demo memory', () => {
  it('starts without fabricated observations and with training disabled', () => {
    expect(initialDemo().observations).toEqual([]);
    expect(initialDemo().conversations).toEqual([]);
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
  it('keeps a demo cry on device without uploading or translating it', () => {
    const saved = buildDemoObservation({ uri: 'file:///companion-audio/cry.m4a', kind: 'AUDIO', durationMs: 3_200, mimeType: 'audio/m4a', petId: 'cat-a', question: '왜 울까요?', contextTags: ['창가에서'], idempotencyKey: 'audio-1' }, [], []);
    expect(saved.kind).toBe('AUDIO');
    expect(saved.localAudioUri).toBe('file:///companion-audio/cry.m4a');
    expect(saved.status).toBe('ABSTAINED');
    expect(saved.inference?.utterance).toBeNull();
    expect(saved.inference?.observation.join(' ')).toContain('소리를 분석하지 않아요');
    expect(saved.media[0]).toMatchObject({ kind: 'AUDIO', mimeType: 'audio/m4a', durationMs: 3_200, url: '' });
    expect(saved.media[0].url).not.toMatch(/^https?:/);
    expect(() => buildDemoObservation({ uri: 'file:///long.m4a', kind: 'AUDIO', durationMs: 46_001, petId: 'cat-a', question: '', contextTags: [], idempotencyKey: 'audio-long' }, [], [])).toThrow('AUDIO_TOO_LONG');
    expect(() => buildDemoObservation({ uri: 'file:///missing.m4a', kind: 'AUDIO', petId: 'cat-a', question: '', contextTags: [], idempotencyKey: 'audio-empty' }, [], [])).toThrow('AUDIO_TOO_LONG');
  });

  it('saves a cited demo conversation and reads the same thread after reload', async () => {
    const windowObs = { ...record('window', 'cat-a', '2026-09-01T00:00:00Z'), question: '창가에서 오래 울었어요', contextTags: ['창가에서'] };
    const toyObs = { ...record('toy', 'cat-a', '2026-09-03T00:00:00Z'), question: '장난감을 안 봐요', contextTags: ['거실에서'] };
    const older: FeedbackRecord = { id: 'f-old', observationId: 'window', action: '간식을 줬어요', reaction: '창가로 다시 갔어요', note: null, happenedAt: '2026-09-01T12:00:00Z', createdAt: '2026-09-01T12:00:00Z' };
    const newer: FeedbackRecord = { id: 'f-new', observationId: 'toy', action: '놀아줬어요', reaction: '장난감을 따라왔어요', note: null, happenedAt: '2026-09-03T12:00:00Z', createdAt: '2026-09-03T12:00:00Z' };
    const aboutWindow = '창가에서 간식을 줬어요';
    const matched = groundedDemoReply('cat-a', [windowObs, toyObs], [older, newer], aboutWindow);
    expect(matched.citedObservationIds).toEqual(['window']);
    expect(matched.text).toContain('간식을 줬어요');
    expect(matched.text).toContain('창가로 다시 갔어요');
    expect(matched.text).not.toContain('장난감을 따라왔어요');
    expect(matched.text).toContain('실제 AI 분석이 아니에요');
    expect(matched.text).not.toMatch(/알아들었어요|이해했어요|말을 했어요/);
    const aboutToy = groundedDemoReply('cat-a', [windowObs, toyObs], [older, newer], '장난감을 따라왔어요');
    expect(aboutToy.citedObservationIds).toEqual(['toy']);
    expect(aboutToy.text).not.toContain('가장 최근');
    const latestOnly = groundedDemoReply('cat-a', [windowObs, toyObs], [older, newer], '오늘 어땠나요');
    expect(latestOnly.citedObservationIds).toEqual(['toy']);
    expect(latestOnly.text).toContain('가장 최근에 저장한 반응');
    await changeDemo(data => { data.observations = [windowObs, toyObs]; data.feedback = [older, newer]; data.conversations = []; });
    const calls = jest.mocked(writeDemo).mock.calls.length;
    const saved = await saveDemoConversation('cat-a', aboutWindow, 'thread-1', new Date('2026-09-04T00:00:00Z'));
    expect(saved.citedObservationIds).toEqual(['window']);
    expect(saved.question).toBe(aboutWindow);
    expect(saved.createdAt).toBe('2026-09-04T00:00:00.000Z');
    expect(jest.mocked(writeDemo).mock.calls.length).toBe(calls + 1);
    const raw = jest.mocked(writeDemo).mock.calls[calls][0] as string;
    const legacy = initialDemo();
    const { conversations: _ignored, ...withoutThreads } = legacy;
    expect(demoFromStorage(JSON.stringify(withoutThreads)).conversations).toEqual([]);
    jest.mocked(readDemo).mockResolvedValueOnce(raw);
    clearDemoMemory();
    const loaded = await getDemo();
    expect(loaded.conversations.filter(item => item.petId === 'cat-a').map(item => ({ id: item.id, question: item.question, answer: item.answer, cited: item.citedObservationIds, at: item.createdAt }))).toEqual([
      { id: 'thread-1', question: aboutWindow, answer: saved.answer, cited: ['window'], at: saved.createdAt },
    ]);
    const again = await saveDemoConversation('cat-a', aboutWindow, 'thread-1', new Date('2026-09-05T00:00:00Z'));
    expect(again).toEqual(saved);
    expect((await getDemo()).conversations.filter(item => item.id === 'thread-1')).toHaveLength(1);
    await expect(saveDemoConversation('cat-a', '다른 질문', 'thread-1')).rejects.toThrow('IDEMPOTENCY_CONFLICT');
  });
});
