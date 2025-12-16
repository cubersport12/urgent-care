import { supabase } from '@/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { AppArticleVm, NullableValue } from './types';
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
