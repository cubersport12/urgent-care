import { useCallback, useEffect, useState } from 'react';
import { AppTestVm } from './types';
import { apiFetchRelation } from './useApiFetch';

export const useTests = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<Awaited<ReturnType<typeof apiFetchRelation<AppTestVm>>>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiFetchRelation<AppTestVm>('tests', {
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
