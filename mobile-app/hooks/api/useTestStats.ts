import { apiFetch } from '@/lib/api';
import type { ApiListResponse } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeviceId } from '../use-device-id';
import { AppTestStatsVm } from './types';
import { apiFetchRelation } from './useApiFetch';

export const useAddOrUpdateTestStats = (stats: AppTestStatsVm) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addOrUpdate = useCallback(
    async (updates?: Partial<AppTestStatsVm>) => {
      setIsLoading(true);
      setError(null);
      try {
        const dataToUpsert = {
          testId: stats.testId,
          startedAt: updates?.startedAt ?? stats.startedAt,
          completedAt: updates?.completedAt ?? stats.completedAt,
          passed: updates?.passed ?? stats.passed ?? null,
          data: updates?.data ?? stats.data ?? null,
        };
        return await apiFetch<AppTestStatsVm>('/api/v1/tests-stats', {
          method: 'PUT',
          body: JSON.stringify(dataToUpsert),
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to add or update test stats');
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [stats.testId, stats.startedAt, stats.completedAt, stats.passed, stats.data],
  );

  return { addOrUpdate, isLoading, error };
};

export const useTestsStats = (testsIds: string[]) => {
  const [response, setResponse] = useState<Partial<ApiListResponse<AppTestStatsVm>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { deviceId } = useDeviceId();
  const memoizedTestsIds = useMemo(() => [...testsIds].sort(), [testsIds]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await apiFetchRelation<AppTestStatsVm>('tests_stats');
      const filtered = (r.data ?? []).filter((s) => memoizedTestsIds.includes(s.testId));
      setResponse({ data: filtered, error: r.error });
    } finally {
      setIsLoading(false);
    }
  }, [memoizedTestsIds]);

  useEffect(() => {
    if (testsIds.length > 0 && deviceId) {
      void fetchData();
    }
  }, [fetchData, testsIds.length, deviceId]);

  return { ...response, isLoading, fetchData };
};
