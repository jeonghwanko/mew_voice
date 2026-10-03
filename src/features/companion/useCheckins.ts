import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompanionCheckin, CompanionListResponse, CreateCompanionCheckinInput, UpdateCompanionCheckinInput } from '@findthem/shared';
import { useCompanion } from './useCompanion';
import { getDemo } from './demo';
import { ApiError, api, request } from '../../lib/api';
import { deleteDemoCheckin, moveDemoCheckin, saveDemoCheckin, updateDemoCheckin } from './checkinStore';
import { checkinListPath } from './observationPages';
import { resolveCitedCareMap, type CitedCareRecord } from './daily';
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
  // Account mode has no route that moves a check-in to another pet. Do not pretend a server update happened.
  const move = async (id: string, petId: string) => {
    if (!companion.demo) throw new Error('CHECKIN_PET_ACCOUNT_READONLY');
    const record = await moveDemoCheckin(id, petId);
    await invalidate();
    return record;
  };
  return { ...companion, list, items: list.data?.pages.flatMap(page => page.items) ?? [], create, update, remove, move };
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

/** Current cited care, from the loaded list or one check-in read. Another cat still counts when the id matches. A confirmed miss is gone; a failed read stays absent. */
export function useCitedCheckinMoments(ids: readonly string[]) {
  const checkins = useCheckins();
  const joined = ids.join('\0');
  const unique = useMemo(() => [...new Set(joined.split('\0').filter(Boolean))], [joined]);
  const known = useMemo(() => {
    const map = new Map<string, CitedCareRecord>();
    for (const item of checkins.items) map.set(item.id, citedCareFromCheckin(item));
    return map;
  }, [checkins.items]);
  // Not being on this cat's list is not a miss. The same id may now belong to another cat, so read it.
  const missingKey = unique.filter(id => !known.has(id)).join('\0');
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
  return useMemo(() => resolveCitedCareMap({ known, extra: extra.data ?? [] }), [known, extra.data]);
}
