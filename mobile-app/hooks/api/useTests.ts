import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { AppTestVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

const RELATION_NAME = 'tests';

export const useTests = (folderId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppTestVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => folderId?.length ? ref.filter('parentId', 'eq', folderId ?? '') : ref.filter('parentId', 'is', null));
      setResponse(result);
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};

