import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompanionCheckin, CompanionListResponse, CreateCompanionCheckinInput, UpdateCompanionCheckinInput } from '@findthem/shared';
import { useCompanion } from './useCompanion';
import { getDemo } from './demo';
import { ApiError, api, request } from '../../lib/api';
import { deleteDemoCheckin, saveDemoCheckin, updateDemoCheckin } from './checkinStore';
import { checkinListPath } from './observationPages';
import { type CitedCareRecord } from './daily';
export { checkinLabels } from './daily';

const base = '/pet-companion/checkins';
export function useCheckins() {
  const companion = useCompanion();
  const client = useQueryClient();
  const petId = companion.activePet?.id;
  const list = useInfiniteQuery({
    queryKey: [...companion.key, 'checkins', petId], enabled: !!petId,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<CompanionListResponse<CompanionCheckin>> => {
      if (companion.demo) return { items: (await getDemo()).checkins.filter(item => item.petId === petId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), nextCursor: null };
      if (!petId) return { items: [], nextCursor: null };
      return api.get(checkinListPath(petId, pageParam));
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  const invalidate = () => client.invalidateQueries({ queryKey: companion.key });
  const create = async (input: CreateCompanionCheckinInput) => {
    const record = companion.demo ? await saveDemoCheckin(input) : await api.post<CompanionCheckin>(base, input);
    await invalidate(); return record;
  };
  const update = async (id: string, input: UpdateCompanionCheckinInput) => {
    const record = companion.demo ? await updateDemoCheckin(id, input) : await api.patch<CompanionCheckin>(`${base}/${id}`, input);
    await invalidate(); return record;
  };
  const remove = async (id: string, version: number) => {
    if (companion.demo) await deleteDemoCheckin(id, version); else await request(`${base}/${id}`, 'DELETE', { version });
    await invalidate();
  };
  return { ...companion, list, items: list.data?.pages.flatMap(page => page.items) ?? [], create, update, remove };
}
export async function loadCheckinById(demo: boolean, id: string): Promise<CompanionCheckin> {
  if (!demo) return api.get(`${base}/${id}`);
  const record = (await getDemo()).checkins.find(item => item.id === id);
  if (!record) throw new Error('NOT_FOUND');
  return record;
}
export function useCheckin(id?: string) {
  const companion = useCompanion();
  return useQuery({ queryKey: [...companion.key, 'checkin', id], enabled: !!id,
    queryFn: () => loadCheckinById(companion.demo, id!),
  });
}

function citedCareFromCheckin(item: { kind: string; note?: string | null; occurredAt?: string | null; createdAt?: string | null }): CitedCareRecord {
  return { status: 'saved', occurredAt: item.occurredAt || item.createdAt || '', kind: item.kind, note: item.note?.trim() || null };
}

function citedCareMissing(error: unknown) {
  return (error instanceof ApiError && error.status === 404) || (error instanceof Error && error.message === 'NOT_FOUND');
}

/** Current cited care, from the loaded list or one check-in read. A confirmed miss is gone; a failed read stays absent. */
export function useCitedCheckinMoments(ids: readonly string[]) {
  const checkins = useCheckins();
  const joined = ids.join('\0');
  const unique = useMemo(() => [...new Set(joined.split('\0').filter(Boolean))], [joined]);
  const known = useMemo(() => {
    const map = new Map<string, CitedCareRecord>();
    for (const item of checkins.items) map.set(item.id, citedCareFromCheckin(item));
    return map;
  }, [checkins.items]);
  const listComplete = checkins.list.isSuccess && !checkins.list.hasNextPage;
  const missingKey = (listComplete ? [] : unique.filter(id => !known.has(id))).join('\0');
  const extra = useQuery({
    queryKey: [...checkins.key, 'cited-checkin-moments', missingKey],
    enabled: missingKey.length > 0,
    retry: false,
    queryFn: async () => {
      return Promise.all(missingKey.split('\0').map(async id => {
        try {
          return { id, record: citedCareFromCheckin(await loadCheckinById(checkins.demo, id)) };
        } catch (error) {
          return { id, record: citedCareMissing(error) ? { status: 'gone' as const } : null };
        }
      }));
    },
  });
  return useMemo(() => {
    const map = new Map(known);
    if (listComplete) {
      for (const id of unique) if (!map.has(id)) map.set(id, { status: 'gone' });
    }
    for (const item of extra.data ?? []) {
      if (!item.record || map.has(item.id)) continue;
      map.set(item.id, item.record);
    }
    return map;
  }, [known, extra.data, listComplete, unique]);
}
