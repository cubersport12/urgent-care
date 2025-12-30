import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { RescueStoryVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

const RELATION_NAME = 'rescue_stories';

export const useRescueStories = (rescueId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<RescueStoryVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => rescueId?.length ? ref.filter('rescueId', 'eq', rescueId ?? '') : ref);
      setResponse(result);
    } finally {
      setIsLoading(false);
    }
  }, [rescueId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};

