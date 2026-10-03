import type { CompanionCheckin, CompanionConversation, CompanionInference, CompanionObservation } from '@findthem/shared';
import { changeDemo, getDemo, initialDemo, saveDemoConversation, type FeedbackRecord } from './demo';
import { citedReactionGoneText, dayKey, observationCitedReactions, presentCitedReactionAnswer, resolveCitedReactionMap } from './daily';
import { deleteDemoObservation, moveDemoObservation, updateDemoObservationCaption, updateDemoObservationMedia, updateDemoObservationTime } from './observationStore';
import { summarizeWeek } from './weeklySummary';
import { errorMessage } from '../../lib/api';

jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));

const observation = (id: string, petId = 'demo-momo', kind: CompanionObservation['kind'] = 'PHOTO'): CompanionObservation => ({
  id, petId, createdAt: id === 'obs-2' ? '2026-09-03T00:00:00Z' : '2026-09-01T00:00:00Z', completedAt: '2026-09-01T00:00:00Z', kind,
  question: id === 'obs-2' ? '식후에는 왜 그르릉거릴까요?' : '창가에서 왜 울까요?', contextTags: ['창가에서'], status: 'ABSTAINED', failureCode: null, media: [], inference: null, feedback: [],
});
const reaction = (id: string, observationId: string, createdAt: string): FeedbackRecord => ({ id, observationId, action: '놀아줬어요', reaction: '따라왔어요', note: '메모', happenedAt: createdAt, createdAt });
const inference = (cited: string[]): CompanionInference => ({
  id: 'inf-2', observationId: 'obs-2', status: 'ABSTAINED', utterance: null, confidence: 'low', reason: null,
  observation: ['보호자가 남긴 기록이에요.'], possibilities: [], limitations: [], suggestedAction: null, citedObservationIds: cited, createdAt: '2026-09-03T00:00:00Z',
});
const checkin = (): CompanionCheckin => ({ id: 'care-1', petId: 'demo-momo', kind: 'PLAY', note: '낚싯대로 놀았어요', occurredAt: '2026-09-02T00:00:00Z', version: 1, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' });

beforeEach(async () => { await changeDemo(data => Object.assign(data, initialDemo())); });

it('deletes one observation and its reactions without a stand-in or other records', async () => {
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: ['care-1'], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  const other = observation('obs-2');
  other.question = '식후에는 왜 그르릉거릴까요?';
  other.contextTags = [];
  other.inference = inference(['obs-1']);
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [{ ...observation('obs-1', 'demo-momo', 'AUDIO'), localAudioUri: 'file:///companion-audio/obs-1.m4a' }, other, observation('obs-3', 'demo-nabi', 'VIDEO')];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('older', 'obs-1', '2026-09-01T01:00:00Z'), { ...reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z'), action: '밥을 줬어요', reaction: '먹었어요' }];
    data.checkins = [checkin()];
    data.conversations = [thread];
  });
  const removed = await deleteDemoObservation('obs-1');
  const state = await getDemo();
  expect(removed?.localAudioUri).toBe('file:///companion-audio/obs-1.m4a');
  expect(state.observations.map(item => item.id)).toEqual(['obs-2', 'obs-3']);
  expect(state.feedback.map(item => item.id)).toEqual(['on-2']);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.conversations).toHaveLength(1);
  expect(state.conversations[0].question).toBe('창가에서 왜 울까요?');
  expect(state.conversations[0].answer).toBe(saved);
  expect(state.conversations[0].citedObservationIds).toEqual(['obs-1']);
  expect(state.observations.find(item => item.id === 'obs-2')?.inference?.citedObservationIds).toEqual(['obs-1']);
  const moments = resolveCitedReactionMap({
    ids: ['obs-1'],
    known: new Map(),
    loadedIds: new Set(state.observations.map(item => item.id)),
    listComplete: true,
    extra: [],
  });
  expect(moments.get('obs-1')).toEqual({ status: 'gone' });
  const shown = presentCitedReactionAnswer(state.conversations[0].answer, moments.get('obs-1'));
  expect(shown).toContain(citedReactionGoneText);
  expect(shown).not.toContain('놀아줬어요');
  expect(shown).not.toContain('따라왔어요');
  expect(observationCitedReactions(['obs-1'], moments)).toEqual([{ id: 'obs-1', line: citedReactionGoneText, open: false }]);
  const again = await saveDemoConversation('demo-momo', '창가에서 왜 울까요?', 'thread-2', new Date('2026-09-04T00:00:00Z'));
  expect(again.citedObservationIds).not.toContain('obs-1');
  expect(again.answer).not.toContain('따라왔어요');
  expect((await getDemo()).conversations.find(item => item.id === 'thread-1')?.question).toBe('창가에서 왜 울까요?');
  await expect(deleteDemoObservation('obs-1')).resolves.toBeNull();
  expect((await getDemo()).observations.map(item => item.id)).toEqual(['obs-2', 'obs-3']);
});

it('still deletes after storage consent is withdrawn and does not invent an account delete', async () => {
  await changeDemo(data => {
    data.consent.serviceStorage = false;
    data.observations = [observation('photo-1', 'demo-momo', 'PHOTO')];
    data.feedback = [reaction('only', 'photo-1', '2026-09-01T00:00:00Z')];
  });
  await expect(deleteDemoObservation('photo-1')).resolves.toEqual({ localPhotoUri: undefined, localAudioUri: undefined, localVideoUri: undefined });
  const state = await getDemo();
  expect(state.observations).toEqual([]);
  expect(state.feedback).toEqual([]);
  expect(errorMessage(new Error('OBSERVATION_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 관찰은 여기서 지울 수 없어요. 이 기기의 체험 기록만 삭제할 수 있어요.');
});

it('corrects one observation caption without touching media, reactions, or other records', async () => {
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: [], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  const inference = { id: 'inf-1', observationId: 'obs-1', status: 'ABSTAINED' as const, utterance: null, confidence: 'low' as const, reason: '체험 모드에서는 AI를 호출하지 않아요.', observation: ['보호자가 사진과 상황을 입력했어요.'], possibilities: [], limitations: ['체험용 화면이며 실제 AI 분석 결과가 아닙니다.'], suggestedAction: null, citedObservationIds: [], createdAt: '2026-09-01T00:00:00Z' };
  const photo = { ...observation('obs-1', 'demo-momo', 'PHOTO'), localPhotoUri: 'file:///companion-photos/obs-1.jpg', inference, contextTags: ['창가에서', '베란다'] };
  const other = { ...observation('obs-2'), localAudioUri: 'file:///companion-audio/obs-2.m4a' };
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [photo, other, { ...observation('obs-3', 'demo-nabi', 'VIDEO'), localVideoUri: 'file:///companion-videos/obs-3.mp4' }];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z')];
    data.checkins = [checkin()];
    data.conversations = [thread];
  });
  const updated = await updateDemoObservationCaption('obs-1', { question: '  식탁 위를 봐요  ', contextTags: ['식사 후', '베란다', '놀이 중'] });
  const state = await getDemo();
  const kept = state.observations.find(item => item.id === 'obs-1');
  expect(updated.question).toBe('식탁 위를 봐요');
  expect(updated.contextTags).toEqual(['식사 후', '베란다', '놀이 중']);
  expect(kept).toMatchObject({
    question: '식탁 위를 봐요',
    contextTags: ['식사 후', '베란다', '놀이 중'],
    petId: 'demo-momo',
    kind: 'PHOTO',
    status: 'ABSTAINED',
    localPhotoUri: 'file:///companion-photos/obs-1.jpg',
    createdAt: photo.createdAt,
  });
  expect(kept?.inference).toEqual(inference);
  expect(kept?.localAudioUri).toBeUndefined();
  expect(state.observations.find(item => item.id === 'obs-2')).toMatchObject({ question: '식후에는 왜 그르릉거릴까요?', localAudioUri: 'file:///companion-audio/obs-2.m4a' });
  expect(state.observations.find(item => item.id === 'obs-3')?.localVideoUri).toBe('file:///companion-videos/obs-3.mp4');
  expect(state.feedback).toEqual([reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z')]);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.conversations[0].answer).toBe(saved);
  expect(state.conversations[0].question).toBe('창가에서 왜 울까요?');
  const again = await saveDemoConversation('demo-momo', '식탁 위를 봐요', 'thread-2', new Date('2026-09-04T00:00:00Z'));
  expect(again.citedObservationIds).toEqual(['obs-1']);
  expect(again.answer).toContain('놀아줬어요');
  expect((await getDemo()).conversations[0].answer).toBe(saved);
  await updateDemoObservationCaption('obs-1', { question: '   ', contextTags: [] });
  expect((await getDemo()).observations.find(item => item.id === 'obs-1')).toMatchObject({ question: null, contextTags: [], localPhotoUri: 'file:///companion-photos/obs-1.jpg' });
});

it('rejects a caption that is not already on the observation and does not invent an account update', async () => {
  await changeDemo(data => { data.observations = [{ ...observation('obs-1'), contextTags: ['창가에서'] }]; data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z')]; });
  await expect(updateDemoObservationCaption('obs-1', { question: '식탁', contextTags: ['병원'] })).rejects.toThrow('INVALID_OBSERVATION_CAPTION');
  await expect(updateDemoObservationCaption('obs-1', { question: '식탁', contextTags: ['창가에서', '창가에서'] })).rejects.toThrow('INVALID_OBSERVATION_CAPTION');
  await expect(updateDemoObservationCaption('obs-1', { question: '가'.repeat(1501), contextTags: [] })).rejects.toThrow('INVALID_OBSERVATION_CAPTION');
  await expect(updateDemoObservationCaption('missing', { question: '식탁', contextTags: [] })).rejects.toThrow('NOT_FOUND');
  const state = await getDemo();
  expect(state.observations[0].question).toBe('창가에서 왜 울까요?');
  expect(state.observations[0].contextTags).toEqual(['창가에서']);
  expect(state.feedback).toHaveLength(1);
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(updateDemoObservationCaption('obs-1', { question: '식탁 위를 봐요', contextTags: ['식사 후'] })).rejects.toThrow('CONSENT_REQUIRED');
  expect((await getDemo()).observations[0].question).toBe('창가에서 왜 울까요?');
  expect(errorMessage(new Error('INVALID_OBSERVATION_CAPTION'))).toBe('질문과 상황 태그를 확인해 주세요.');
  expect(errorMessage(new Error('OBSERVATION_CAPTION_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 질문과 상황 태그는 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});

it('replaces only one observation media file and keeps id, caption, reactions, and other records', async () => {
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: [], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  const inference = { id: 'inf-1', observationId: 'obs-1', status: 'ABSTAINED' as const, utterance: null, confidence: 'low' as const, reason: '체험 모드에서는 AI를 호출하지 않아요.', observation: ['보호자가 사진과 상황을 입력했어요.'], possibilities: [], limitations: ['체험용 화면이며 실제 AI 분석 결과가 아닙니다.'], suggestedAction: null, citedObservationIds: [], createdAt: '2026-09-01T00:00:00Z' };
  const photo = { ...observation('obs-1', 'demo-momo', 'PHOTO'), localPhotoUri: 'file:///companion-photos/old.jpg', inference, question: '창가에서 왜 울까요?', contextTags: ['창가에서'] };
  const audio = { ...observation('obs-2', 'demo-momo', 'AUDIO'), localAudioUri: 'file:///companion-audio/cry.m4a', media: [{ kind: 'AUDIO' as const, mimeType: 'audio/m4a', byteSize: 12, durationMs: 2_000, url: '' }] };
  const video = { ...observation('obs-3', 'demo-momo', 'VIDEO'), localVideoUri: 'file:///companion-videos/clip.mp4', media: [{ kind: 'VIDEO' as const, mimeType: 'video/mp4', byteSize: 20, durationMs: 4_000, url: '' }] };
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [photo, audio, video, { ...observation('obs-4', 'demo-nabi', 'PHOTO'), localPhotoUri: 'file:///companion-photos/nabi.jpg' }];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z')];
    data.checkins = [checkin()];
    data.conversations = [thread];
  });
  const photoSwap = await updateDemoObservationMedia('obs-1', { uri: 'file:///companion-photos/new.jpg', kind: 'PHOTO' });
  expect(photoSwap.previous.localPhotoUri).toBe('file:///companion-photos/old.jpg');
  expect(photoSwap.observation).toMatchObject({ id: 'obs-1', petId: 'demo-momo', kind: 'PHOTO', question: '창가에서 왜 울까요?', contextTags: ['창가에서'], localPhotoUri: 'file:///companion-photos/new.jpg', status: 'ABSTAINED' });
  expect(photoSwap.observation.inference).toEqual(inference);
  const audioSwap = await updateDemoObservationMedia('obs-2', { uri: 'file:///companion-audio/new.m4a', kind: 'AUDIO', durationMs: 3_500, mimeType: 'audio/m4a', byteSize: 40 });
  expect(audioSwap.previous.localAudioUri).toBe('file:///companion-audio/cry.m4a');
  expect(audioSwap.observation).toMatchObject({ id: 'obs-2', kind: 'AUDIO', localAudioUri: 'file:///companion-audio/new.m4a' });
  expect(audioSwap.observation.media).toEqual([{ kind: 'AUDIO', mimeType: 'audio/m4a', byteSize: 40, durationMs: 3_500, url: '' }]);
  const videoSwap = await updateDemoObservationMedia('obs-3', { uri: 'file:///companion-videos/new.mp4', kind: 'VIDEO', durationMs: 8_000, mimeType: 'video/mp4', byteSize: 80 });
  expect(videoSwap.previous.localVideoUri).toBe('file:///companion-videos/clip.mp4');
  expect(videoSwap.observation).toMatchObject({ id: 'obs-3', kind: 'VIDEO', localVideoUri: 'file:///companion-videos/new.mp4' });
  expect(videoSwap.observation.media).toEqual([{ kind: 'VIDEO', mimeType: 'video/mp4', byteSize: 80, durationMs: 8_000, url: '' }]);
  const state = await getDemo();
  expect(state.observations.find(item => item.id === 'obs-1')).toMatchObject({ question: '창가에서 왜 울까요?', contextTags: ['창가에서'], localPhotoUri: 'file:///companion-photos/new.jpg' });
  expect(state.observations.find(item => item.id === 'obs-1')?.inference).toEqual(inference);
  expect(state.observations.find(item => item.id === 'obs-4')?.localPhotoUri).toBe('file:///companion-photos/nabi.jpg');
  expect(state.feedback).toEqual([reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z')]);
  expect(state.checkins.map(item => item.id)).toEqual(['care-1']);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.conversations[0].answer).toBe(saved);
  expect(state.conversations[0].question).toBe('창가에서 왜 울까요?');
  const again = await saveDemoConversation('demo-momo', '창가에서 왜 울까요?', 'thread-2', new Date('2026-09-04T00:00:00Z'));
  expect(again.citedObservationIds).toEqual(['obs-1']);
  expect(again.answer).toContain('놀아줬어요');
});

it('rejects a media kind change or account replace and does not invent a server upload', async () => {
  await changeDemo(data => {
    data.observations = [
      { ...observation('photo-1', 'demo-momo', 'PHOTO'), localPhotoUri: 'file:///companion-photos/a.jpg' },
      { ...observation('audio-1', 'demo-momo', 'AUDIO'), localAudioUri: 'file:///companion-audio/a.m4a', media: [{ kind: 'AUDIO', mimeType: 'audio/m4a', byteSize: 1, durationMs: 1_000, url: '' }] },
    ];
    data.feedback = [reaction('only', 'photo-1', '2026-09-01T00:00:00Z')];
  });
  await expect(updateDemoObservationMedia('photo-1', { uri: 'file:///companion-audio/b.m4a', kind: 'AUDIO', durationMs: 2_000 })).rejects.toThrow('INVALID_OBSERVATION_MEDIA');
  await expect(updateDemoObservationMedia('photo-1', { uri: '   ', kind: 'PHOTO' })).rejects.toThrow('INVALID_OBSERVATION_MEDIA');
  await expect(updateDemoObservationMedia('audio-1', { uri: 'file:///companion-audio/long.m4a', kind: 'AUDIO', durationMs: 46_001 })).rejects.toThrow('AUDIO_TOO_LONG');
  await expect(updateDemoObservationMedia('missing', { uri: 'file:///companion-photos/b.jpg', kind: 'PHOTO' })).rejects.toThrow('NOT_FOUND');
  const before = await getDemo();
  expect(before.observations.find(item => item.id === 'photo-1')?.localPhotoUri).toBe('file:///companion-photos/a.jpg');
  expect(before.feedback).toHaveLength(1);
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(updateDemoObservationMedia('photo-1', { uri: 'file:///companion-photos/b.jpg', kind: 'PHOTO' })).rejects.toThrow('CONSENT_REQUIRED');
  expect((await getDemo()).observations.find(item => item.id === 'photo-1')?.localPhotoUri).toBe('file:///companion-photos/a.jpg');
  expect(errorMessage(new Error('INVALID_OBSERVATION_MEDIA'))).toBe('같은 종류의 사진·울음·영상만 바꿀 수 있어요.');
  expect(errorMessage(new Error('OBSERVATION_MEDIA_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 사진·울음·영상은 여기서 바꿀 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});

it('moves one observation to another existing cat and keeps id, media, caption, and reactions', async () => {
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: ['care-1'], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  const inference = { id: 'inf-1', observationId: 'obs-1', status: 'ABSTAINED' as const, utterance: null, confidence: 'low' as const, reason: '체험 모드에서는 AI를 호출하지 않아요.', observation: ['보호자가 사진과 상황을 입력했어요.'], possibilities: [], limitations: ['체험용 화면이며 실제 AI 분석 결과가 아닙니다.'], suggestedAction: null, citedObservationIds: ['older-photo'], createdAt: '2026-09-01T00:00:00Z' };
  const photo = { ...observation('obs-1', 'demo-momo', 'PHOTO'), localPhotoUri: 'file:///companion-photos/obs-1.jpg', inference, question: '창가에서 왜 울까요?', contextTags: ['창가에서', '베란다'] };
  const audio = { ...observation('obs-2', 'demo-momo', 'AUDIO'), localAudioUri: 'file:///companion-audio/obs-2.m4a', media: [{ kind: 'AUDIO' as const, mimeType: 'audio/m4a', byteSize: 12, durationMs: 2_000, url: '' }] };
  const nabiPhoto = { ...observation('obs-3', 'demo-nabi', 'VIDEO'), localVideoUri: 'file:///companion-videos/nabi.mp4' };
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [photo, audio, nabiPhoto];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('older', 'obs-1', '2026-09-01T01:00:00Z'), reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z')];
    data.checkins = [checkin()];
    data.conversations = [thread];
  });
  const moved = await moveDemoObservation('obs-1', '  demo-nabi  ');
  const state = await getDemo();
  const kept = state.observations.find(item => item.id === 'obs-1');
  expect(moved).toMatchObject({ id: 'obs-1', petId: 'demo-nabi', kind: 'PHOTO', question: '창가에서 왜 울까요?', contextTags: ['창가에서', '베란다'], localPhotoUri: 'file:///companion-photos/obs-1.jpg', status: 'ABSTAINED', createdAt: photo.createdAt });
  expect(moved.inference).toEqual(inference);
  expect(kept).toMatchObject({ id: 'obs-1', petId: 'demo-nabi', question: '창가에서 왜 울까요?', contextTags: ['창가에서', '베란다'], localPhotoUri: 'file:///companion-photos/obs-1.jpg' });
  expect(kept?.inference).toEqual(inference);
  expect(kept?.media).toEqual([]);
  expect(state.observations.find(item => item.id === 'obs-2')).toMatchObject({ petId: 'demo-momo', localAudioUri: 'file:///companion-audio/obs-2.m4a' });
  expect(state.observations.find(item => item.id === 'obs-3')?.localVideoUri).toBe('file:///companion-videos/nabi.mp4');
  expect(state.feedback).toEqual([reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('older', 'obs-1', '2026-09-01T01:00:00Z'), reaction('on-2', 'obs-2', '2026-09-03T00:00:00Z')]);
  expect(state.checkins).toEqual([checkin()]);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.conversations[0]).toMatchObject({ id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, citedObservationIds: ['obs-1'] });
  const forNabi = await saveDemoConversation('demo-nabi', '창가에서 왜 울까요?', 'thread-nabi', new Date('2026-09-04T00:00:00Z'));
  expect(forNabi.citedObservationIds).toEqual(['obs-1']);
  expect(forNabi.answer).toContain('놀아줬어요');
  const forMomo = await saveDemoConversation('demo-momo', '창가에서 왜 울까요?', 'thread-momo', new Date('2026-09-04T00:00:00Z'));
  expect(forMomo.citedObservationIds).not.toContain('obs-1');
  expect((await getDemo()).conversations.find(item => item.id === 'thread-1')?.answer).toBe(saved);
  const audioMove = await moveDemoObservation('obs-2', 'demo-nabi');
  expect(audioMove).toMatchObject({ id: 'obs-2', petId: 'demo-nabi', kind: 'AUDIO', localAudioUri: 'file:///companion-audio/obs-2.m4a', question: '식후에는 왜 그르릉거릴까요?' });
  expect(audioMove.media).toEqual([{ kind: 'AUDIO', mimeType: 'audio/m4a', byteSize: 12, durationMs: 2_000, url: '' }]);
});

it('rejects a move to the same cat, a missing cat, or an account and does not invent a pet', async () => {
  await changeDemo(data => {
    data.observations = [{ ...observation('obs-1', 'demo-momo', 'PHOTO'), localPhotoUri: 'file:///companion-photos/obs-1.jpg', contextTags: ['창가에서'] }];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z')];
  });
  await expect(moveDemoObservation('obs-1', 'demo-momo')).rejects.toThrow('INVALID_OBSERVATION_PET');
  await expect(moveDemoObservation('obs-1', '   ')).rejects.toThrow('INVALID_OBSERVATION_PET');
  await expect(moveDemoObservation('obs-1', 'demo-made-up')).rejects.toThrow('NOT_FOUND');
  await expect(moveDemoObservation('missing', 'demo-momo')).rejects.toThrow('NOT_FOUND');
  const before = await getDemo();
  expect(before.pets.map(item => item.id)).toEqual(['demo-momo']);
  expect(before.observations[0]).toMatchObject({ id: 'obs-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', contextTags: ['창가에서'], localPhotoUri: 'file:///companion-photos/obs-1.jpg' });
  expect(before.feedback).toHaveLength(1);
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(moveDemoObservation('obs-1', 'demo-nabi')).rejects.toThrow('CONSENT_REQUIRED');
  const state = await getDemo();
  expect(state.pets).toEqual(before.pets);
  expect(state.observations[0].petId).toBe('demo-momo');
  expect(state.feedback).toHaveLength(1);
  expect(errorMessage(new Error('INVALID_OBSERVATION_PET'))).toBe('옮길 아이를 확인해 주세요.');
  expect(errorMessage(new Error('OBSERVATION_PET_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 관찰은 여기서 다른 아이에게 옮길 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});

it('corrects one observation time in place so the diary and weekly summary follow the new time', async () => {
  const now = new Date('2026-10-03T02:00:00.000Z');
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '창가에서 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: ['care-1'], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  const inference = { id: 'inf-1', observationId: 'obs-1', status: 'ABSTAINED' as const, utterance: null, confidence: 'low' as const, reason: '체험 모드에서는 AI를 호출하지 않아요.', observation: ['보호자가 사진과 상황을 입력했어요.'], possibilities: [], limitations: ['체험용 화면이며 실제 AI 분석 결과가 아닙니다.'], suggestedAction: null, citedObservationIds: ['older-photo'], createdAt: '2026-09-01T00:00:00Z' };
  const photo = { ...observation('obs-1', 'demo-momo', 'PHOTO'), localPhotoUri: 'file:///companion-photos/obs-1.jpg', inference, question: '창가에서 왜 울까요?', contextTags: ['창가에서', '베란다'], createdAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-01T00:00:00.000Z' };
  const audio = { ...observation('obs-2', 'demo-momo', 'AUDIO'), localAudioUri: 'file:///companion-audio/obs-2.m4a', media: [{ kind: 'AUDIO' as const, mimeType: 'audio/m4a', byteSize: 12, durationMs: 2_000, url: '' }], createdAt: '2026-10-02T01:00:00.000Z', contextTags: ['놀이 중'] };
  const video = { ...observation('obs-3', 'demo-momo', 'VIDEO'), localVideoUri: 'file:///companion-videos/obs-3.mp4', media: [{ kind: 'VIDEO' as const, mimeType: 'video/mp4', byteSize: 20, durationMs: 4_000, url: '' }], createdAt: '2026-10-02T12:00:00.000Z', contextTags: ['창가에서'] };
  await changeDemo(data => {
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비' });
    data.observations = [photo, audio, video];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('on-2', 'obs-2', '2026-10-02T01:00:00Z')];
    data.checkins = [checkin()];
    data.conversations = [thread];
  });
  const before = summarizeWeek({ petId: 'demo-momo', now, demo: true, observations: [photo, audio, video], feedback: [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('on-2', 'obs-2', '2026-10-02T01:00:00Z')], checkins: [checkin()] });
  expect(before.observationCount).toBe(2);
  expect(before.photoCount).toBe(0);
  expect(dayKey(photo.createdAt)).toBe('2026-09-01');
  const updated = await updateDemoObservationTime('obs-1', '  2026-10-02T10:30:00.000Z  ', now);
  const audioMoved = await updateDemoObservationTime('obs-2', '2026-09-01T00:00:00.000Z', now);
  const videoKept = await updateDemoObservationTime('obs-3', '2026-10-01T00:00:00.000Z', now);
  const state = await getDemo();
  expect(state.observations).toHaveLength(3);
  expect(updated).toMatchObject({ id: 'obs-1', petId: 'demo-momo', kind: 'PHOTO', question: '창가에서 왜 울까요?', contextTags: ['창가에서', '베란다'], localPhotoUri: 'file:///companion-photos/obs-1.jpg', status: 'ABSTAINED', createdAt: '2026-10-02T10:30:00.000Z', completedAt: '2026-09-01T00:00:00.000Z' });
  expect(updated.inference).toEqual(inference);
  expect(audioMoved).toMatchObject({ id: 'obs-2', kind: 'AUDIO', localAudioUri: 'file:///companion-audio/obs-2.m4a', createdAt: '2026-09-01T00:00:00.000Z', question: '식후에는 왜 그르릉거릴까요?' });
  expect(audioMoved.media).toEqual(audio.media);
  expect(videoKept).toMatchObject({ id: 'obs-3', kind: 'VIDEO', localVideoUri: 'file:///companion-videos/obs-3.mp4', createdAt: '2026-10-01T00:00:00.000Z' });
  const kept = state.observations.find(item => item.id === 'obs-1');
  expect(kept?.inference).toEqual(inference);
  expect(kept?.media).toEqual([]);
  expect(state.feedback).toEqual([reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z'), reaction('on-2', 'obs-2', '2026-10-02T01:00:00Z')]);
  expect(state.checkins).toEqual([checkin()]);
  expect(state.pets.map(item => item.id)).toEqual(['demo-momo', 'demo-nabi']);
  expect(state.conversations[0]).toMatchObject({ id: 'thread-1', question: '창가에서 왜 울까요?', answer: saved, citedObservationIds: ['obs-1'] });
  const diary = state.observations.map(item => ({ id: `observation-${item.id}`, at: item.createdAt })).sort((a, b) => b.at.localeCompare(a.at));
  expect(diary.map(item => item.id)).toEqual(['observation-obs-1', 'observation-obs-3', 'observation-obs-2']);
  expect(dayKey(diary[0].at)).toBe('2026-10-02');
  const summary = summarizeWeek({ petId: 'demo-momo', now, demo: true, observations: state.observations, feedback: state.feedback, checkins: state.checkins });
  expect(summary.observationCount).toBe(2);
  expect(summary.photoCount).toBe(1);
  expect(summary.audioCount).toBe(0);
  expect(summary.videoCount).toBe(1);
  expect(summary.feedbackCount).toBe(1);
  expect(summary.frequentTags).toEqual([{ tag: '창가에서', count: 2 }, { tag: '베란다', count: 1 }]);
  const again = await saveDemoConversation('demo-momo', '창가에서 왜 울까요?', 'thread-2', new Date('2026-10-03T01:00:00.000Z'));
  expect(again.citedObservationIds).toEqual(['obs-1']);
  expect(again.answer).toContain('놀아줬어요');
  expect((await getDemo()).conversations.find(item => item.id === 'thread-1')?.answer).toBe(saved);
  expect((await getDemo()).observations.find(item => item.id === 'obs-1')?.inference).toEqual(inference);
});

it('rejects an empty or future observation time and does not invent an account update', async () => {
  const now = new Date('2026-10-03T02:00:00.000Z');
  const photo = { ...observation('obs-1', 'demo-momo', 'PHOTO'), localPhotoUri: 'file:///companion-photos/obs-1.jpg', createdAt: '2026-09-01T00:00:00.000Z' };
  await changeDemo(data => {
    data.observations = [photo];
    data.feedback = [reaction('on-1', 'obs-1', '2026-09-01T00:00:00Z')];
  });
  await expect(updateDemoObservationTime('obs-1', '   ', now)).rejects.toThrow('INVALID_OBSERVATION_TIME');
  await expect(updateDemoObservationTime('obs-1', 'not-a-time', now)).rejects.toThrow('INVALID_OBSERVATION_TIME');
  await expect(updateDemoObservationTime('obs-1', '2026-10-03T02:00:00.001Z', now)).rejects.toThrow('OBSERVATION_TIME_FUTURE');
  await expect(updateDemoObservationTime('missing', '2026-10-02T00:00:00.000Z', now)).rejects.toThrow('NOT_FOUND');
  const kept = await getDemo();
  expect(kept.observations).toHaveLength(1);
  expect(kept.observations[0]).toMatchObject({ id: 'obs-1', createdAt: '2026-09-01T00:00:00.000Z', localPhotoUri: 'file:///companion-photos/obs-1.jpg', question: '창가에서 왜 울까요?', contextTags: ['창가에서'] });
  expect(kept.feedback).toHaveLength(1);
  const same = await updateDemoObservationTime('obs-1', now.toISOString(), now);
  expect(same.createdAt).toBe(now.toISOString());
  expect(same.id).toBe('obs-1');
  expect(same.inference).toBeNull();
  await changeDemo(data => { data.consent.serviceStorage = false; });
  await expect(updateDemoObservationTime('obs-1', '2026-10-01T00:00:00.000Z', now)).rejects.toThrow('CONSENT_REQUIRED');
  expect((await getDemo()).observations[0].createdAt).toBe(now.toISOString());
  expect(errorMessage(new Error('INVALID_OBSERVATION_TIME'))).toBe('기록 시각을 확인해 주세요.');
  expect(errorMessage(new Error('OBSERVATION_TIME_FUTURE'))).toBe('미래 시각은 기록할 수 없어요. 이전 시각을 그대로 두었어요.');
  expect(errorMessage(new Error('OBSERVATION_TIME_ACCOUNT_READONLY'))).toBe('이 계정에 남긴 관찰 시각은 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});
