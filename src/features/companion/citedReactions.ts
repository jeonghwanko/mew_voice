import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../lib/api';
import { citedReactionFromFeedback, resolveCitedReactionMap, type CitedReactionRecord } from './daily';
import { loadObservationById, useCompanion } from './useCompanion';

function citedReactionMissing(error: unknown) {
  return (error instanceof ApiError && error.status === 404) || (error instanceof Error && error.message === 'NOT_FOUND');
}

/**
 * Current cited reaction, from the loaded list or one observation read.
 * An id that is not on this cat's list is read by id, so a citation can follow another cat's saved observation.
 * A confirmed miss is gone. A failed read stays absent. The stored answer is not rewritten.
 */
export function useCitedReactionMoments(ids: readonly string[]) {
  const companion = useCompanion();
  const joined = ids.join('\0');
  const unique = useMemo(() => [...new Set(joined.split('\0').filter(Boolean))], [joined]);
  const pages = companion.observations.data?.pages;
  const loaded = useMemo(() => {
    const known = new Map<string, CitedReactionRecord>();
    const loadedIds = new Set<string>();
    for (const item of pages?.flatMap(page => page.items) ?? []) {
      loadedIds.add(item.id);
      const record = citedReactionFromFeedback(item.feedback);
      if (record) known.set(item.id, record);
    }
    return { known, loadedIds };
  }, [pages]);
  const listComplete = companion.observations.isSuccess && !companion.observations.hasNextPage;
  const listPending = companion.observations.isLoading && !pages;
  const missingKey = (listPending ? [] : unique.filter(id => !loaded.known.has(id) && !loaded.loadedIds.has(id))).join('\0');
  const extra = useQuery({
    queryKey: [...companion.key, 'cited-reaction-moments', missingKey],
    enabled: missingKey.length > 0,
    retry: false,
    queryFn: async () => Promise.all(missingKey.split('\0').map(async id => {
      try {
        const observation = await loadObservationById(companion.demo, id);
        return { id, record: citedReactionFromFeedback(observation.feedback) };
      } catch (error) {
        return { id, record: citedReactionMissing(error) ? { status: 'gone' as const } : null };
      }
    })),
  });
  return useMemo(() => {
    const rows = extra.data ?? [];
    const known = new Map(loaded.known);
    const loadedIds = new Set(loaded.loadedIds);
    const gone: { id: string; record: CitedReactionRecord }[] = [];
    for (const item of rows) {
      if (item.record === null) { loadedIds.add(item.id); continue; }
      if (item.record.status === 'gone') { gone.push({ id: item.id, record: item.record }); continue; }
      if (!known.has(item.id)) known.set(item.id, item.record);
      loadedIds.add(item.id);
    }
    const pendingAbsent = unique.some(id => !known.has(id) && !loaded.loadedIds.has(id) && !rows.some(row => row.id === id));
    return resolveCitedReactionMap({
      ids: unique,
      known,
      loadedIds,
      listComplete: listComplete && !pendingAbsent,
      extra: gone,
    });
  }, [unique, loaded, listComplete, extra.data]);
}
