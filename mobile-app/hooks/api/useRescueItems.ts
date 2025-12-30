import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { AppRescueItemVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

const RELATION_NAME = 'rescue';

export const useRescueItems = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppRescueItemVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId ?? '') : ref.filter('parentId', 'is', null));
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

