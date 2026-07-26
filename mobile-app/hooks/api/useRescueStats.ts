import { apiFetch } from '@/lib/api';
import type { ApiListResponse } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeviceId } from '../use-device-id';
import { AppRescueStatsVm } from './types';
import { apiFetchRelation } from './useApiFetch';

type RescueStatsKeys = Pick<AppRescueStatsVm, 'clientId' | 'rescueId'>;

type RescueStatsPatch = Partial<
  Pick<AppRescueStatsVm, 'startedAt' | 'completedAt' | 'passed' | 'data' | 'id'>
>;

export const useAddOrUpdateRescueStats = (keys: RescueStatsKeys) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addOrUpdate = useCallback(
    async (patch: RescueStatsPatch) => {
      if (!keys.clientId || !keys.rescueId) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const existingList = await apiFetchRelation<AppRescueStatsVm>('rescue_stats', {
          rescueId: keys.rescueId,
        });
        const row = existingList.data?.[0] ?? null;

        const isNewSession = patch.startedAt !== undefined && patch.completedAt === undefined;

        let startedAt = row?.startedAt;
        let completedAt = row?.completedAt ?? null;
        let passed = row?.passed ?? null;
        let data: AppRescueStatsVm['data'] = row?.data ?? null;

        if (isNewSession) {
          startedAt = patch.startedAt;
          completedAt = null;
          passed = null;
          if (patch.data !== undefined) data = patch.data;
        } else {
          if (patch.startedAt !== undefined) startedAt = patch.startedAt;
          if (patch.completedAt !== undefined) completedAt = patch.completedAt;
          if (patch.passed !== undefined) passed = patch.passed;
          if (patch.data !== undefined) data = patch.data;
        }

        const finalStartedAt = startedAt ?? patch.completedAt ?? new Date().toISOString();

        return await apiFetch<AppRescueStatsVm>('/api/v1/rescue-stats', {
          method: 'PUT',
          body: JSON.stringify({
            rescueId: keys.rescueId,
            startedAt: finalStartedAt,
            completedAt,
            passed,
            data,
          }),
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to add or update rescue stats');
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [keys.clientId, keys.rescueId],
  );

  return { addOrUpdate, isLoading, error };
};

export const useRescuesStats = (rescueIds: string[]) => {
  const [response, setResponse] = useState<Partial<ApiListResponse<AppRescueStatsVm>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { deviceId } = useDeviceId();
  const memoizedIds = useMemo(() => [...rescueIds].sort(), [rescueIds]);

  const fetchData = useCallback(async () => {
    if (memoizedIds.length === 0) {
      setResponse({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const r = await apiFetchRelation<AppRescueStatsVm>('rescue_stats');
      const filtered = (r.data ?? []).filter((s) => memoizedIds.includes(s.rescueId));
      setResponse({ data: filtered, error: r.error });
    } finally {
      setIsLoading(false);
    }
  }, [memoizedIds]);

  useEffect(() => {
    if (rescueIds.length > 0 && deviceId) {
      void fetchData();
    }
  }, [fetchData, rescueIds.length, deviceId]);

  return { ...response, isLoading, fetchData };
};
