import { usePetSelection } from '../../core/petSelection';
import { resolveSelectedPet } from './daily';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { CompanionDeletion, CompanionListResponse, CompanionPet, CompanionObservation, CompanionConsent, CompanionFeedbackInput, CompanionConversation, CreateCompanionPetInput } from '@findthem/shared';
import { useSession } from '../../core/session';
import { api, request } from '../../lib/api';
import { buildDemoObservation, changeDemo, createId, getDemo, groundedDemoReply } from './demo';
import { OBSERVATION_PAGE_SIZE, pageObservations } from './observationPages';

export type Observation = CompanionObservation & { localPhotoUri?: string; localAudioUri?: string; localVideoUri?: string };
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
      if (!demo) return api.get<CompanionListResponse<Observation>>(`${base}/observations?petId=${activePet.id}&limit=${OBSERVATION_PAGE_SIZE}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`);
      const data = await getDemo();
      const owned = data.observations.filter(o => o.petId === activePet.id).map(o => ({ ...o, feedback: data.feedback.filter(f => f.observationId === o.id) }));
      return pageObservations(owned, pageParam);
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    refetchInterval: query => query.state.data?.pages.some(page => page.items.some(o => o.status === 'QUEUED' || o.status === 'PROCESSING')) ? 2500 : false,
  });
  const deletions = useQuery({ queryKey: [...key, 'deletions'], enabled: !!session && !demo, queryFn: async () => (await api.get<{ items: CompanionDeletion[] }>(`${base}/deletions`)).items, refetchInterval: q => q.state.data?.some(item => item.status === 'PENDING') ? 5000 : false });
  const createPet = async (input: CreateCompanionPetInput) => {
    const result = demo ? await changeDemo(data => { const date = new Date().toISOString(); const pet: CompanionPet = { id: createId(), name: input.name, species: 'CAT', confirmedTraits: input.confirmedTraits ?? {}, profilePhotoUrl: null, createdAt: date, updatedAt: date }; data.pets.push(pet); return pet; }) : await api.post<CompanionPet>(`${base}/pets`, input);
    await invalidate(); return result;
  };
  const saveConsent = async (serviceStorage: boolean, researchTraining: boolean) => {
    if (demo) await changeDemo(data => { data.consent = { serviceStorage, researchTraining, updatedAt: new Date().toISOString() }; });
    else await request(`${base}/consent`, 'PUT', { serviceStorage, researchTraining, version: '2026-09-10-v1' });
    await invalidate();
  };
  const submitMedia = async (draft: MediaDraft) => {
    let result: Observation;
    if (draft.kind === 'VIDEO' && !demo) throw new Error('VIDEO_LOCAL_ONLY');
    if (demo) result = await changeDemo(data => {
      if (!data.consent.serviceStorage) throw new Error('CONSENT_REQUIRED');
      const existing = data.observations.find(o => o.id === draft.idempotencyKey); if (existing) return existing;
      const observation = buildDemoObservation(draft, data.observations, data.feedback);
      data.observations.push(observation); return observation;
    });
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
    if (demo) await changeDemo(data => { data.feedback.push({ ...input, note: input.note ?? null, happenedAt: input.happenedAt ?? new Date().toISOString(), createdAt: new Date().toISOString(), id: createId(), observationId: id }); });
    else await api.post(`${base}/observations/${id}/feedback`, input);
    await invalidate();
  };
  const removePet = async (id: string) => {
    if (demo && Platform.OS !== 'web') {
      const owned = (await getDemo()).observations.filter(o => o.petId === id);
      const files = [...owned.map(o => o.localPhotoUri), ...owned.map(o => o.localAudioUri), ...owned.map(o => o.localVideoUri)];
      for (const uri of files) if (uri?.startsWith(FileSystem.documentDirectory + 'companion-photos/') || uri?.startsWith(FileSystem.documentDirectory + 'companion-audio/') || uri?.startsWith(FileSystem.documentDirectory + 'companion-videos/')) await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    if (demo) await changeDemo(data => { const deleted = new Set(data.observations.filter(o => o.petId === id).map(o => o.id)); data.pets = data.pets.filter(p => p.id !== id); data.observations = data.observations.filter(o => o.petId !== id); data.feedback = data.feedback.filter(f => !deleted.has(f.observationId)); data.checkins = data.checkins.filter(item => item.petId !== id); });
    else { try { await api.delete(`${base}/pets/${id}`); } finally { await invalidate(); } }
    await invalidate();
  };
  const retry = async (id: string) => { await api.post(`${base}/observations/${id}/retry`); await invalidate(); };
  const ask = async (petId: string, text: string, idempotencyKey: string): Promise<CompanionConversation> => {
    if (demo) { const data = await getDemo(); const reply = groundedDemoReply(petId, data.observations, data.feedback); return { id: reply.id, petId, question: text, answer: reply.text, status: 'COMPLETED', citedObservationIds: reply.citedObservationIds, createdAt: new Date().toISOString(), completedAt: new Date().toISOString() }; }
    const created = await api.post<{ id: string }>(`${base}/pets/${petId}/conversations`, { message: text, idempotencyKey });
    return api.get<CompanionConversation>(`${base}/conversations/${created.id}`);
  };
  return { key, demo, pets, activePet, selectPet: selection.selectPet, selectionReady: selection.ready, consent, observations, deletions, createPet, saveConsent, submitPhoto, submitMedia, feedback, removePet, retry, ask, invalidate };
}

export function useObservation(id: string) {
  const { key, demo, observations } = useCompanion();
  return useQuery({ queryKey: [...key, 'observation', id], enabled: !!id, queryFn: async (): Promise<Observation> => {
    if (demo) { const state = await getDemo(); const observation = state.observations.find(o => o.id === id); if (!observation) throw new Error('NOT_FOUND'); return { ...observation, feedback: state.feedback.filter(f => f.observationId === id) }; }
    return api.get<Observation>(`${base}/observations/${id}`);
  }, initialData: () => observations.data?.pages.flatMap(page => page.items).find(o => o.id === id), refetchInterval: q => q.state.data && ['QUEUED', 'PROCESSING'].includes(q.state.data.status) ? 2500 : false });
}

