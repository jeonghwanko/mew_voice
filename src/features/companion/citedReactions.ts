import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../lib/api';
import { citedReactionFromFeedback, resolveCitedReactionMap, type CitedReactionRecord } from './daily';
import { loadObservationById, useCompanion } from './useCompanion';

function citedReactionMissing(error: unknown) {
  return (error instanceof ApiError && error.status === 404) || (error instanceof Error && error.message === 'NOT_FOUND');
}

/** Current cited reaction, from the loaded list or one observation read. A confirmed miss is gone; a failed read stays absent. */
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
  const missingKey = (listPending ? [] : unique.filter(id => {
    if (loaded.known.has(id)) return false;
    if (listComplete && !loaded.loadedIds.has(id)) return false;
    return true;
  })).join('\0');
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
  return useMemo(() => resolveCitedReactionMap({
    ids: unique,
    known: loaded.known,
    loadedIds: loaded.loadedIds,
    listComplete,
    extra: extra.data ?? [],
  }), [unique, loaded, listComplete, extra.data]);
}
