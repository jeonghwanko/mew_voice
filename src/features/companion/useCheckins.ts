import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompanionCheckin, CompanionListResponse, CreateCompanionCheckinInput, UpdateCompanionCheckinInput } from '@findthem/shared';
import { useCompanion } from './useCompanion';
import { getDemo } from './demo';
import { api, request } from '../../lib/api';
import { deleteDemoCheckin, saveDemoCheckin, updateDemoCheckin } from './checkinStore';
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
      return api.get(`${base}?petId=${petId}&limit=50${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`);
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
export function useCheckin(id?: string) {
  const companion = useCompanion();
  return useQuery({ queryKey: [...companion.key, 'checkin', id], enabled: !!id,
    queryFn: async (): Promise<CompanionCheckin> => {
      if (!companion.demo) return api.get(`${base}/${id}`);
      const record = (await getDemo()).checkins.find(item => item.id === id);
      if (!record) throw new Error('NOT_FOUND');
      return record;
    },
  });
}
