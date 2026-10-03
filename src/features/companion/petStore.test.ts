import type { CompanionCheckin, CompanionConversation, CompanionObservation } from '@findthem/shared';
import { changeDemo, getDemo, initialDemo, type FeedbackRecord } from './demo';
import { updateDemoPetProfile } from './petStore';
import { errorMessage } from '../../lib/api';

jest.mock('../../core/storage', () => ({ readDemo: jest.fn().mockResolvedValue(null), writeDemo: jest.fn().mockResolvedValue(undefined) }));

const observation = (id: string, petId = 'demo-momo'): CompanionObservation => ({
  id, petId, createdAt: '2026-09-01T00:00:00Z', completedAt: '2026-09-01T00:00:00Z', kind: 'PHOTO',
  question: '창가에서 왜 울까요?', contextTags: ['창가에서'], status: 'ABSTAINED', failureCode: null, media: [], inference: null, feedback: [],
});
const reaction = (id: string, observationId: string): FeedbackRecord => ({ id, observationId, action: '놀아줬어요', reaction: '따라왔어요', note: '메모', happenedAt: '2026-09-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z' });
const checkin = (): CompanionCheckin => ({ id: 'care-1', petId: 'demo-momo', kind: 'PLAY', note: '낚싯대', occurredAt: '2026-09-02T00:00:00Z', version: 1, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z' });

beforeEach(async () => { await changeDemo(data => Object.assign(data, initialDemo())); });

it('corrects name, age, breed, and sex without dropping the cat or its records', async () => {
  const saved = '모모에게 남긴 질문이에요. 체험 모드에서는 AI가 답변하지 않아요.';
  const thread: CompanionConversation = { id: 'thread-1', petId: 'demo-momo', question: '모모는 왜 울까요?', answer: saved, status: 'COMPLETED', citedObservationIds: ['obs-1'], citedCheckinIds: ['care-1'], createdAt: '2026-09-02T00:00:00Z', completedAt: '2026-09-02T00:00:00Z' };
  await changeDemo(data => {
    data.pets[0] = { ...data.pets[0], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' };
    data.pets.push({ ...data.pets[0], id: 'demo-nabi', name: '나비', confirmedTraits: { age: '1살', breed: '코리안 숏헤어', sex: '암컷', source: 'guardian' }, createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z' });
    data.observations = [{ ...observation('obs-1'), localPhotoUri: 'file:///companion-photos/obs-1.jpg' }, observation('obs-2', 'demo-nabi')];
    data.feedback = [reaction('on-1', 'obs-1')];
    data.checkins = [checkin()];
    data.conversations = [thread];
  });
  const updated = await updateDemoPetProfile('demo-momo', { name: '  모모야  ', age: '  4살  ', breed: '   ', sex: '수컷' });
  const state = await getDemo();
  const kept = state.pets.find(item => item.id === 'demo-momo');
  expect(updated.id).toBe('demo-momo');
  expect(updated.name).toBe('모모야');
  expect(updated.species).toBe('CAT');
  expect(updated.profilePhotoUrl).toBeNull();
  expect(updated.createdAt).toBe('2026-08-01T00:00:00.000Z');
  expect(updated.confirmedTraits).toEqual({ age: '4살', breed: '모름', sex: '수컷', source: 'guardian' });
  expect(kept).toMatchObject({ name: '모모야', species: 'CAT', profilePhotoUrl: null, createdAt: '2026-08-01T00:00:00.000Z' });
  expect(kept?.updatedAt).not.toBe('2026-08-01T00:00:00.000Z');
  expect(state.pets.find(item => item.id === 'demo-nabi')).toMatchObject({ name: '나비', confirmedTraits: { age: '1살', breed: '코리안 숏헤어', sex: '암컷', source: 'guardian' } });
  expect(state.observations.map(item => item.id)).toEqual(['obs-1', 'obs-2']);
  expect(state.observations[0]).toMatchObject({ petId: 'demo-momo', question: '창가에서 왜 울까요?', localPhotoUri: 'file:///companion-photos/obs-1.jpg' });
  expect(state.feedback).toEqual([reaction('on-1', 'obs-1')]);
  expect(state.checkins).toEqual([checkin()]);
  expect(state.conversations[0]).toMatchObject({ question: '모모는 왜 울까요?', answer: saved, petId: 'demo-momo' });
});

it('rejects a profile that is not a name or a known sex and does not invent an account update', async () => {
  const before = await getDemo();
  await expect(updateDemoPetProfile('demo-momo', { name: '   ', age: '3살', breed: '모름', sex: '모름' })).rejects.toThrow('INVALID_PET_PROFILE');
  await expect(updateDemoPetProfile('demo-momo', { name: '가'.repeat(51), age: '3살', breed: '모름', sex: '모름' })).rejects.toThrow('INVALID_PET_PROFILE');
  await expect(updateDemoPetProfile('demo-momo', { name: '모모', age: '가'.repeat(41), breed: '모름', sex: '모름' })).rejects.toThrow('INVALID_PET_PROFILE');
  await expect(updateDemoPetProfile('demo-momo', { name: '모모', age: '3살', breed: '가'.repeat(51), sex: '모름' })).rejects.toThrow('INVALID_PET_PROFILE');
  await expect(updateDemoPetProfile('demo-momo', { name: '모모', age: '3살', breed: '모름', sex: '중성' })).rejects.toThrow('INVALID_PET_PROFILE');
  await expect(updateDemoPetProfile('missing', { name: '모모', age: '3살', breed: '모름', sex: '모름' })).rejects.toThrow('NOT_FOUND');
  const state = await getDemo();
  expect(state.pets).toEqual(before.pets);
  expect(state.observations).toEqual([]);
  expect(errorMessage(new Error('INVALID_PET_PROFILE'))).toBe('이름과 알고 있는 나이·품종·성별을 확인해 주세요.');
  expect(errorMessage(new Error('PET_PROFILE_ACCOUNT_READONLY'))).toBe('이 계정에 등록한 아이 정보는 여기서 고칠 수 없어요. 이 기기의 체험 기록만 수정할 수 있어요.');
});
