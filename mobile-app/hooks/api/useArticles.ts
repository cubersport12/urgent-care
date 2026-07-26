import { apiFetch } from '@/lib/api';
import { downloadMediaBlob } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeviceId } from '../use-device-id';
import { AppArticleStatsVm, AppArticleVm, NullableValue } from './types';
import type { ApiListResponse } from '@/lib/api';
import { apiFetchRelation } from './useApiFetch';

export const useArticles = (parentId?: string) => {
  const [response, setResponse] = useState<
    Partial<Awaited<ReturnType<typeof apiFetchRelation<AppArticleVm>>>>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiFetchRelation<AppArticleVm>('articles', {
        parentId: parentId?.length ? parentId : null,
      });
      setResponse(result);
    } finally {
      setIsLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};

export const fetchArticle = async (articleId: string) => {
  const r = await apiFetchRelation<AppArticleVm>('articles', { id: articleId });
  return {
    ...r,
    data: r?.data?.[0] ?? null,
  };
};

export const useArticle = (articleId: NullableValue<string>) => {
  const [response, setResponse] = useState<Partial<{ data: AppArticleVm | null; error: Error | null }>>(
    {},
  );

  useEffect(() => {
    if (articleId != null) {
      const fetchArticles = async () => {
        const result = await fetchArticle(articleId);
        setResponse(result);
      };
      void fetchArticles();
    }
  }, [articleId]);
  return response;
};

export const useAddOrUpdateArticleStats = (stats: Omit<AppArticleStatsVm, 'createdAt'>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addOrUpdate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AppArticleStatsVm>('/api/v1/articles-stats', {
        method: 'PUT',
        body: JSON.stringify({
          articleId: stats.articleId,
          readed: stats.readed ?? false,
          createdAt: new Date().toJSON(),
        }),
      });
      return data;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to add or update article stats');
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [stats.articleId, stats.readed]);

  return { addOrUpdate, isLoading, error };
};

export const useArticlesStats = (articlesIds: string[]) => {
  const [response, setResponse] = useState<Partial<ApiListResponse<AppArticleStatsVm>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { deviceId } = useDeviceId();
  const articlesIdsKey = useMemo(() => [...articlesIds].sort().join(','), [articlesIds]);
  const memoizedArticlesIds = useMemo(() => articlesIds, [articlesIdsKey]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await apiFetchRelation<AppArticleStatsVm>('articles_stats');
      const filtered = (r.data ?? []).filter((s) => memoizedArticlesIds.includes(s.articleId));
      setResponse({ data: filtered, error: r.error });
    } finally {
      setIsLoading(false);
    }
  }, [memoizedArticlesIds]);

  useEffect(() => {
    if (articlesIds.length > 0 && deviceId) {
      void fetchData();
    }
  }, [fetchData, articlesIds.length, deviceId]);

  return { ...response, isLoading, fetchData };
};

export const useFileContentString = (fileName: string) => {
  const [response, setResponse] = useState<NullableValue<string>>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const blob = await downloadMediaBlob(fileName);
      const text = await blob.text();
      setResponse(text);
    } finally {
      setIsLoading(false);
    }
  }, [fileName]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { response, isLoading, fetchData };
};
