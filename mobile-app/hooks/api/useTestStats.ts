import { apiFetch } from '@/lib/api';
import { useCallback, useState } from 'react';
import { AppTestStatsVm } from './types';
import { useContentStats } from './useContentStats';

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
  return useContentStats<AppTestStatsVm>('tests_stats', testsIds, 'testId');
};
