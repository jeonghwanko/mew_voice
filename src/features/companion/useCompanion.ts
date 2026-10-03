import { usePetSelection } from '../../core/petSelection';
import { resolveSelectedPet } from './daily';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { CompanionDeletion, CompanionListResponse, CompanionPet, CompanionObservation, CompanionConsent, CompanionFeedbackInput, CompanionConversation, CreateCompanionPetInput } from '@findthem/shared';
import { useSession } from '../../core/session';
import { api, request } from '../../lib/api';
import { buildDemoObservation, changeDemo, createId, getDemo, saveDemoConversation } from './demo';
import { deleteDemoFeedback, moveDemoFeedback, updateDemoFeedback, updateDemoFeedbackTime, type UpdateDemoFeedbackInput } from './reactionStore';
import { deleteDemoObservation, moveDemoObservation, updateDemoObservationCaption, updateDemoObservationMedia, updateDemoObservationTime, type UpdateDemoObservationCaptionInput, type UpdateDemoObservationMediaInput } from './observationStore';
import { deleteDemoConversation, moveDemoConversation, retargetDemoConversationCheckin, retargetDemoConversationObservation, updateDemoConversationQuestion, updateDemoConversationTime } from './conversationStore';
import { updateDemoPetProfile, type UpdateDemoPetProfileInput } from './petStore';
import { durableDemoMediaUri, forgetObservationDemoMedia, forgetPetDemoMedia, playableDemoObservations, reassignObservationDemoMedia, revokeDemoMediaUrls } from './webMediaStore';
import { observationListPath, pageObservations } from './observationPages';

export type Observation = CompanionObservation & { localPhotoUri?: string; localAudioUri?: string; localVideoUri?: string; localMediaVolatile?: boolean };
export type PhotoDraft = { uri: string; petId: string; question: string; contextTags: string[]; idempotencyKey: string };
export type MediaDraft = PhotoDraft & { kind: 'PHOTO' | 'AUDIO' | 'VIDEO'; durationMs?: number; mimeType?: string; byteSize?: number };
const base = '/pet-companion';
export const newRequestId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16); });
export function useCompanion() {
  const { session } = useSession();
  const selection = usePetSelection();
  const client = useQueryClient();
  const demo = session?.mode === 'demo';
  const key = ['companion', session?.mode, session?.userId];
  const invalidate = () => client.invalidateQueries({ queryKey: key });
  const pets = useQuery({ queryKey: [...key, 'pets'], enabled: !!session, queryFn: async () => demo ? (await getDemo()).pets : (await api.get<{ pets: CompanionPet[] }>(`${base}/pets`)).pets });
  const activePet = selection.ready ? resolveSelectedPet(pets.data, selection.selectedPetId) : undefined;
  const consent = useQuery({ queryKey: [...key, 'consent'], enabled: !!session, queryFn: async () => demo ? (await getDemo()).consent : api.get<CompanionConsent>(`${base}/consent`) });
  const observations = useInfiniteQuery({
    queryKey: [...key, 'observations', activePet?.id], enabled: !!session && !!activePet, initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<CompanionListResponse<Observation>> => {
      if (!activePet) return { items: [], nextCursor: null };
      if (!demo) return api.get<CompanionListResponse<Observation>>(observationListPath(activePet.id, pageParam));
      const data = await getDemo();
      const owned = data.observations.filter(o => o.petId === activePet.id).map(o => ({ ...o, feedback: data.feedback.filter(f => f.observationId === o.id) }));
      const page = pageObservations(owned, pageParam);
      return { ...page, items: await playableDemoObservations(page.items) };
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    refetchInterval: query => query.state.data?.pages.some(page => page.items.some(o => o.status === 'QUEUED' || o.status === 'PROCESSING')) ? 2500 : false,
  });
  const deletions = useQuery({ queryKey: [...key, 'deletions'], enabled: !!session && !demo, queryFn: async () => (await api.get<{ items: CompanionDeletion[] }>(`${base}/deletions`)).items, refetchInterval: q => q.state.data?.some(item => item.status === 'PENDING') ? 5000 : false });
  const createPet = async (input: CreateCompanionPetInput) => {
    const result = demo ? await changeDemo(data => { const date = new Date().toISOString(); const pet: CompanionPet = { id: createId(), name: input.name, species: 'CAT', confirmedTraits: input.confirmedTraits ?? {}, profilePhotoUrl: null, createdAt: date, updatedAt: date }; data.pets.push(pet); return pet; }) : await api.post<CompanionPet>(`${base}/pets`, input);
    await invalidate(); return result;
  };
  // Account mode has no PATCH /pets/:id. Do not pretend a server update happened.
  const updatePetProfile = async (id: string, input: UpdateDemoPetProfileInput) => {
    if (!demo) throw new Error('PET_PROFILE_ACCOUNT_READONLY');
    const pet = await updateDemoPetProfile(id, input);
    await invalidate();
    return pet;
  };
  const saveConsent = async (serviceStorage: boolean, researchTraining: boolean) => {
    if (demo) await changeDemo(data => { data.consent = { serviceStorage, researchTraining, updatedAt: new Date().toISOString() }; });
    else await request(`${base}/consent`, 'PUT', { serviceStorage, researchTraining, version: '2026-09-10-v1' });
    await invalidate();
  };
  const submitMedia = async (draft: MediaDraft) => {
    let result: Observation;
    if (draft.kind === 'VIDEO' && !demo) throw new Error('VIDEO_LOCAL_ONLY');
    if (demo) {
      const existing = (await getDemo()).observations.find(o => o.id === draft.idempotencyKey);
      const durable = existing ? null : await durableDemoMediaUri({ uri: draft.uri, kind: draft.kind, petId: draft.petId, observationId: draft.idempotencyKey, mimeType: draft.mimeType });
      const mediaDraft = durable ? { ...draft, uri: durable.uri, mimeType: durable.mimeType ?? draft.mimeType, byteSize: durable.byteSize ?? draft.byteSize } : draft;
      result = await changeDemo(data => {
        if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
        const already = data.observations.find(o => o.id === mediaDraft.idempotencyKey); if (already) return already;
        const observation = buildDemoObservation(mediaDraft, data.observations, data.feedback);
        data.observations.push(observation); return observation;
      });
    }
    else if (draft.kind === 'PHOTO' || draft.kind === 'AUDIO') {
      const form = new FormData(); form.append('petId', draft.petId); form.append('kind', draft.kind); form.append('question', draft.question); form.append('contextTags', JSON.stringify(draft.contextTags));
      if (draft.durationMs) form.append('durationMs', String(draft.durationMs));
      const name = draft.kind === 'PHOTO' ? 'observation.jpg' : 'cat-cry.m4a';
      const type = draft.mimeType ?? (draft.kind === 'PHOTO' ? 'image/jpeg' : 'audio/m4a');
      if (Platform.OS === 'web') { const blob = await (await fetch(draft.uri)).blob(); form.append('media', blob, name); }
      else form.append('media', { uri: draft.uri, name, type } as unknown as Blob);
      result = await request<Observation>(`${base}/observations`, 'POST', form, undefined, { 'Idempotency-Key': draft.idempotencyKey });
    } else throw new Error('VIDEO_LOCAL_ONLY');
    await invalidate(); return result;
  };
  const submitPhoto = (draft: PhotoDraft) => submitMedia({ ...draft, kind: 'PHOTO' });
  const feedback = async (id: string, input: CompanionFeedbackInput) => {
    if (demo) await changeDemo(data => { data.feedback.push({ ...input, note: input.note ?? null, happenedAt: input.happenedAt ?? new Date().toISOString(), createdAt: new Date().toISOString(), id: createId(), observationId: id, version: 1 }); });
    else await api.post(`${base}/observations/${id}/feedback`, input);
    await invalidate();
  };
  // Account mode can add a reaction. There is no edit or delete route for the latest or an earlier pair, so those stay on this device.
  const updateFeedback = async (observationId: string, feedbackId: string, input: UpdateDemoFeedbackInput) => {
    if (!demo) throw new Error('REACTION_ACCOUNT_READONLY');
    const record = await updateDemoFeedback(observationId, feedbackId, input);
    await invalidate();
    return record;
  };
  const removeFeedback = async (observationId: string, feedbackId: string, version: number) => {
    if (!demo) throw new Error('REACTION_ACCOUNT_READONLY');
    await deleteDemoFeedback(observationId, feedbackId, version);
    await invalidate();
  };
  // Account mode can add a reaction. There is no route that rewrites a saved reaction time. Do not pretend a server update happened.
  const updateFeedbackTime = async (observationId: string, feedbackId: string, happenedAt: string, version: number) => {
    if (!demo) throw new Error('REACTION_TIME_ACCOUNT_READONLY');
    const record = await updateDemoFeedbackTime(observationId, feedbackId, happenedAt, version);
    await invalidate();
    return record;
  };
  // Account mode can add a reaction. There is no route that moves one onto another observation. Do not pretend a server update happened.
  const moveFeedback = async (observationId: string, feedbackId: string, targetObservationId: string, version: number) => {
    if (!demo) throw new Error('REACTION_OBSERVATION_ACCOUNT_READONLY');
    const record = await moveDemoFeedback(observationId, feedbackId, targetObservationId, version);
    await invalidate();
    return record;
  };
  // Account mode has no route that rewrites a saved question or context tags. Do not pretend a server update happened.
  const updateObservationCaption = async (id: string, input: UpdateDemoObservationCaptionInput) => {
    if (!demo) throw new Error('OBSERVATION_CAPTION_ACCOUNT_READONLY');
    const record = await updateDemoObservationCaption(id, input);
    await invalidate();
    return record;
  };
  // Account mode has no media replace route. Do not pretend a server upload happened.
  const replaceObservationMedia = async (id: string, input: UpdateDemoObservationMediaInput) => {
    if (!demo) throw new Error('OBSERVATION_MEDIA_ACCOUNT_READONLY');
    const current = (await getDemo()).observations.find(item => item.id === id);
    if (!current) throw new Error('NOT_FOUND');
    if (current.kind !== input.kind) throw new Error('INVALID_OBSERVATION_MEDIA');
    revokeDemoMediaUrls([id]);
    const durable = await durableDemoMediaUri({ uri: input.uri, kind: input.kind, petId: current.petId, observationId: id, mimeType: input.mimeType });
    const mediaInput = { ...input, uri: durable.uri, mimeType: durable.mimeType ?? input.mimeType, byteSize: durable.byteSize ?? input.byteSize };
    const { previous, observation } = await updateDemoObservationMedia(id, mediaInput);
    if (Platform.OS !== 'web') {
      const root = FileSystem.documentDirectory;
      const files = [previous.localPhotoUri, previous.localAudioUri, previous.localVideoUri];
      for (const uri of files) {
        if (!uri || uri === mediaInput.uri || !root) continue;
        if (uri.startsWith(`${root}companion-photos/`) || uri.startsWith(`${root}companion-audio/`) || uri.startsWith(`${root}companion-videos/`)) await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    }
    await invalidate();
    return observation;
  };
  // Account mode has no route that rewrites a saved observation time. Do not pretend a server update happened.
  const updateObservationTime = async (id: string, createdAt: string) => {
    if (!demo) throw new Error('OBSERVATION_TIME_ACCOUNT_READONLY');
    const record = await updateDemoObservationTime(id, createdAt);
    await invalidate();
    return record;
  };
  // Account mode has no route that moves an observation to another pet. Do not pretend a server update happened.
  const moveObservation = async (id: string, petId: string) => {
    if (!demo) throw new Error('OBSERVATION_PET_ACCOUNT_READONLY');
    const observation = await moveDemoObservation(id, petId);
    await reassignObservationDemoMedia(id, observation.petId);
    await invalidate();
    return observation;
  };
  // Account mode has no DELETE /observations/:id. Do not pretend a server delete happened.
  const removeObservation = async (id: string) => {
    if (!demo) throw new Error('OBSERVATION_ACCOUNT_READONLY');
    if (Platform.OS !== 'web') {
      const current = (await getDemo()).observations.find(item => item.id === id);
      const files = [current?.localPhotoUri, current?.localAudioUri, current?.localVideoUri];
      for (const uri of files) if (uri?.startsWith(FileSystem.documentDirectory + 'companion-photos/') || uri?.startsWith(FileSystem.documentDirectory + 'companion-audio/') || uri?.startsWith(FileSystem.documentDirectory + 'companion-videos/')) await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    await deleteDemoObservation(id);
    await forgetObservationDemoMedia(id);
    await invalidate();
  };
  const removePet = async (id: string) => {
    const removedIds = demo ? (await getDemo()).observations.filter(o => o.petId === id).map(o => o.id) : [];
    if (demo && Platform.OS !== 'web') {
      const owned = (await getDemo()).observations.filter(o => o.petId === id);
      const files = [...owned.map(o => o.localPhotoUri), ...owned.map(o => o.localAudioUri), ...owned.map(o => o.localVideoUri)];
      for (const uri of files) if (uri?.startsWith(FileSystem.documentDirectory + 'companion-photos/') || uri?.startsWith(FileSystem.documentDirectory + 'companion-audio/') || uri?.startsWith(FileSystem.documentDirectory + 'companion-videos/')) await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    if (demo) {
      await changeDemo(data => { const deleted = new Set(data.observations.filter(o => o.petId === id).map(o => o.id)); data.pets = data.pets.filter(p => p.id !== id); data.observations = data.observations.filter(o => o.petId !== id); data.feedback = data.feedback.filter(f => !deleted.has(f.observationId)); data.checkins = data.checkins.filter(item => item.petId !== id); data.conversations = data.conversations.filter(item => item.petId !== id); });
      await forgetPetDemoMedia(id, removedIds);
    }
    else { try { await api.delete(`${base}/pets/${id}`); } finally { await invalidate(); } }
    await invalidate();
  };
  const retry = async (id: string) => { await api.post(`${base}/observations/${id}/retry`); await invalidate(); };
  // Account mode has no DELETE /conversations/:id. Do not pretend a server delete happened.
  const removeConversation = async (id: string) => {
    if (!demo) throw new Error('CONVERSATION_ACCOUNT_READONLY');
    await deleteDemoConversation(id);
    await invalidate();
  };
  // Account mode has no route that rewrites a saved conversation question. Do not pretend a server update happened.
  const updateConversationQuestion = async (id: string, question: string) => {
    if (!demo) throw new Error('CONVERSATION_QUESTION_ACCOUNT_READONLY');
    const conversation = await updateDemoConversationQuestion(id, question);
    await invalidate();
    return conversation;
  };
  // Account mode has no route that rewrites a saved conversation time. The client only creates and reads conversations. Do not pretend a server update happened.
  const updateConversationTime = async (id: string, createdAt: string) => {
    if (!demo) throw new Error('CONVERSATION_TIME_ACCOUNT_READONLY');
    const conversation = await updateDemoConversationTime(id, createdAt);
    await invalidate();
    return conversation;
  };
  // Account mode has no route that moves a conversation to another pet. Do not pretend a server update happened.
  const moveConversation = async (id: string, petId: string) => {
    if (!demo) throw new Error('CONVERSATION_PET_ACCOUNT_READONLY');
    const conversation = await moveDemoConversation(id, petId);
    await invalidate();
    return conversation;
  };
  // Account mode has no route that rewrites a conversation's citations. The client only creates and reads conversations. Do not pretend a server update happened.
  const retargetConversationObservation = async (id: string, index: number, observationId: string) => {
    if (!demo) throw new Error('CONVERSATION_CITATION_ACCOUNT_READONLY');
    const conversation = await retargetDemoConversationObservation(id, index, observationId);
    await invalidate();
    return conversation;
  };
  const retargetConversationCheckin = async (id: string, index: number, checkinId: string) => {
    if (!demo) throw new Error('CONVERSATION_CITATION_ACCOUNT_READONLY');
    const conversation = await retargetDemoConversationCheckin(id, index, checkinId);
    await invalidate();
    return conversation;
  };
  const ask = async (petId: string, text: string, idempotencyKey: string): Promise<CompanionConversation> => {
    if (demo) { const conversation = await saveDemoConversation(petId, text, idempotencyKey); await invalidate(); return conversation; }
    const created = await api.post<{ id: string }>(`${base}/pets/${petId}/conversations`, { message: text, idempotencyKey });
    return api.get<CompanionConversation>(`${base}/conversations/${created.id}`);
  };
  return { key, demo, pets, activePet, selectPet: selection.selectPet, selectionReady: selection.ready, consent, observations, deletions, createPet, updatePetProfile, saveConsent, submitPhoto, submitMedia, feedback, updateFeedback, removeFeedback, updateFeedbackTime, moveFeedback, updateObservationCaption, updateObservationTime, replaceObservationMedia, moveObservation, removeObservation, removeConversation, updateConversationQuestion, updateConversationTime, moveConversation, retargetConversationObservation, retargetConversationCheckin, removePet, retry, ask, invalidate };
}

export async function loadObservationById(demo: boolean, id: string): Promise<Observation> {
  if (demo) {
    const state = await getDemo();
    const observation = state.observations.find(item => item.id === id);
    if (!observation) throw new Error('NOT_FOUND');
    const [playable] = await playableDemoObservations([{ ...observation, feedback: state.feedback.filter(item => item.observationId === id) }]);
    return playable;
  }
  return api.get<Observation>(`${base}/observations/${id}`);
}

export function useObservation(id: string) {
  const { key, demo, observations } = useCompanion();
  return useQuery({
    queryKey: [...key, 'observation', id],
    enabled: !!id,
    queryFn: () => loadObservationById(demo, id),
    initialData: () => observations.data?.pages.flatMap(page => page.items).find(item => item.id === id),
    refetchInterval: query => query.state.data && ['QUEUED', 'PROCESSING'].includes(query.state.data.status) ? 2500 : false,
  });
}

