import { useEffect, useState } from 'react';
import { useSupabaseFetch } from './useSupabaseFetch';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { AppArticleVm } from './types';

const RELATION_NAME = 'articles';

export const useArticles = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppArticleVm[]>>>({});

  useEffect(() => {
    const fetchArticles = async () => {
      const result = await useSupabaseFetch(RELATION_NAME, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId) : ref.filter('parentId', 'is', null));
      setResponse(result);
    };
    void fetchArticles();
  }, [parentId]);
  return response;
};
