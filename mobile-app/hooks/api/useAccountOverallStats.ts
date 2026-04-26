import { PostgrestResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeviceId } from '../use-device-id';
import { AppArticleStatsVm, AppArticleVm, AppRescueItemVm, AppRescueStatsVm, AppTestStatsVm, AppTestVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

export type AccountOverallStatsVm = {
  documentsReadPercent: number;
  testsPassedPercent: number;
  testsFailedPercent: number;
  rescuesPassedPercent: number;
  rescuesFailedPercent: number;
  counts: {
    documentsRead: number;
    testsPassed: number;
    testsFailed: number;
    rescuesPassed: number;
    rescuesFailed: number;
  };
  totals: {
    documents: number;
    tests: number;
    rescues: number;
  };
};

const EMPTY_STATS: AccountOverallStatsVm = {
  documentsReadPercent: 0,
  testsPassedPercent: 0,
  testsFailedPercent: 0,
  rescuesPassedPercent: 0,
  rescuesFailedPercent: 0,
  counts: {
    documentsRead: 0,
    testsPassed: 0,
    testsFailed: 0,
    rescuesPassed: 0,
    rescuesFailed: 0,
  },
  totals: {
    documents: 0,
    tests: 0,
    rescues: 0,
  },
};

const toPercent = (value: number, total: number) => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
};

export const useAccountOverallStats = () => {
  const [stats, setStats] = useState<AccountOverallStatsVm>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { deviceId } = useDeviceId();

  const fetchData = useCallback(async () => {
    if (!deviceId) {
      setStats(EMPTY_STATS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [articlesResponse, testsResponse, rescuesResponse, articleStatsResponse, testStatsResponse, rescueStatsResponse] =
        await Promise.all([
          useSupabaseFetch<AppArticleVm>('articles'),
          useSupabaseFetch<AppTestVm>('tests'),
          useSupabaseFetch<AppRescueItemVm>('rescue'),
          useSupabaseFetch<AppArticleStatsVm>('articles_stats', (ref) => ref.eq('clientId', deviceId)),
          useSupabaseFetch<AppTestStatsVm>('tests_stats', (ref) => ref.eq('clientId', deviceId)),
          useSupabaseFetch<AppRescueStatsVm>('rescue_stats', (ref) => ref.eq('clientId', deviceId)),
        ]);

      const responses: PostgrestResponse<unknown>[] = [
        articlesResponse,
        testsResponse,
        rescuesResponse,
        articleStatsResponse,
        testStatsResponse,
        rescueStatsResponse,
      ];
      const firstError = responses.find((r) => r.error)?.error;
      if (firstError) {
        throw firstError;
      }

      const allArticles = (articlesResponse.data ?? []).filter((a) => a.includeToStatistics !== false);
      const allTests = (testsResponse.data ?? []).filter((t) => t.includeToStatistics !== false);
      const allRescues = rescuesResponse.data ?? [];

      const articleStats = articleStatsResponse.data ?? [];
      const testStats = testStatsResponse.data ?? [];
      const rescueStats = rescueStatsResponse.data ?? [];

      const articleIds = new Set(allArticles.map((a) => a.id));
      const testIds = new Set(allTests.map((t) => t.id));
      const rescueIds = new Set(allRescues.map((r) => r.id));

      const readDocuments = articleStats.filter((s) => articleIds.has(s.articleId) && s.readed === true).length;
      const passedTests = testStats.filter((s) => testIds.has(s.testId) && s.passed === true).length;
      const failedTests = testStats.filter((s) => testIds.has(s.testId) && s.passed === false).length;
      const passedRescues = rescueStats.filter((s) => rescueIds.has(s.rescueId) && s.passed === true).length;
      const failedRescues = rescueStats.filter((s) => rescueIds.has(s.rescueId) && s.passed === false).length;

      setStats({
        documentsReadPercent: toPercent(readDocuments, allArticles.length),
        testsPassedPercent: toPercent(passedTests, allTests.length),
        testsFailedPercent: toPercent(failedTests, allTests.length),
        rescuesPassedPercent: toPercent(passedRescues, allRescues.length),
        rescuesFailedPercent: toPercent(failedRescues, allRescues.length),
        counts: {
          documentsRead: readDocuments,
          testsPassed: passedTests,
          testsFailed: failedTests,
          rescuesPassed: passedRescues,
          rescuesFailed: failedRescues,
        },
        totals: {
          documents: allArticles.length,
          tests: allTests.length,
          rescues: allRescues.length,
        },
      });
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Failed to load account overall stats');
      setError(nextError);
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({
      data: stats,
      isLoading,
      error,
      fetchData,
    }),
    [stats, isLoading, error, fetchData],
  );
};

