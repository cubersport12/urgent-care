import { supabase } from '@/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { useDeviceId } from '../use-device-id';
import { AppArticleStatsVm, AppArticleVm, NullableValue } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

const RELATION_NAME = 'articles';

export const useArticles = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppArticleVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const r = await useSupabaseFetch(RELATION_NAME, ref => ref.filter('id', 'eq', articleId));
  return {
    ...r,
    data: r?.data?.[0]
  } as Partial<PostgrestSingleResponse<AppArticleVm>>;
};

export const useArticle = (articleId: NullableValue<string>) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppArticleVm>>>({});

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

/**
 * Хук для добавления или обновления статистики статьи
 * 
 * @param stats - Данные статистики статьи (clientId, articleId, readed)
 * @returns Объект с функцией для добавления/обновления и состоянием загрузки
 * 
 * @example
 * ```tsx
 * const { addOrUpdate, isLoading, error } = useAddOrUpdateArticleStats({
 *   clientId: 'device-id',
 *   articleId: 'article-id',
 *   readed: true
 * });
 * 
 * await addOrUpdate();
 * ```
 */
export const useAddOrUpdateArticleStats = (stats: Omit<AppArticleStatsVm, 'createdAt'>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addOrUpdate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Подготавливаем данные для вставки/обновления
      const dataToUpsert = {
        id: stats.id,
        clientId: stats.clientId,
        articleId: stats.articleId,
        readed: stats.readed ?? false,
        createdAt: new Date().toJSON()
      } as AppArticleStatsVm;

      // Используем upsert для добавления или обновления записи
      // Конфликт определяется по комбинации clientId и articleId
      const response = await supabase
        .from('articles_stats')
        .upsert(dataToUpsert, {
          onConflict: 'clientId,articleId',
        })
        .select()
        .single();

      if (response.error) {
        throw response.error;
      }

      return response.data as AppArticleStatsVm;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add or update article stats');
      setError(error);
      console.error('Error adding or updating article stats:', err);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [stats.id, stats.clientId, stats.articleId, stats.readed]);

  return {
    addOrUpdate,
    isLoading,
    error,
  };
};

export const useArticlesStats = (articlesIds: string[]) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppArticleStatsVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { deviceId } = useDeviceId();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const r = await useSupabaseFetch('articles_stats', ref => {
        let query = ref.in('articleId', articlesIds);
        if (deviceId) {
          query = query.eq('clientId', deviceId);
        }
        return query;
      });
      setResponse(r);
    } finally {
      setIsLoading(false);
    }
  }, [articlesIds, deviceId]);

  useEffect(() => {
    if (articlesIds.length > 0 && deviceId) {
      void fetchData();
    } else {
      setIsLoading(false);
    }
  }, [fetchData, articlesIds.length, deviceId]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};

export const useFileContentString = (fileName: string) => {
  const [response, setResponse] = useState<NullableValue<string>>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await supabase.storage.from('cubersport12').download(`public/${fileName}`);
      if (r.data instanceof Blob) {
        const reader = new FileReader();

        reader.onload = () => {
          const text = reader.result as string;
          setResponse(text);
          setIsLoading(false);
        };

        reader.onerror = () => {
          setIsLoading(false);
          throw new Error('Failed to read file');
        };

        reader.readAsText(r.data);
      }
      else {
        setIsLoading(false);
        throw new Error('File not found');
      }
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, [fileName]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    response,
    isLoading,
    fetchData,
  };
};
