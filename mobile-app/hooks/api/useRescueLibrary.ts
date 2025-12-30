import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RescueLibraryItemVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

const RELATION_NAME = 'rescue_library';

export const useRescueLibrary = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<RescueLibraryItemVm[]>>>({});
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

export const useRescueLibraryItem = (itemId: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<RescueLibraryItemVm[]>>>({});

  useEffect(() => {
    const fetchItem = async () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => ref.filter('id', 'eq', itemId));
      setResponse(result);
    };
    void fetchItem();
  }, [itemId]);
  
  return {
    ...response,
    data: response.data?.[0]
  };
};

export const useRescueLibraryItems = (itemIds: string[]) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<RescueLibraryItemVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Мемоизируем itemIds для использования в fetchData
  const memoizedItemIds = useMemo(() => [...itemIds].sort(), [itemIds.join(',')]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (memoizedItemIds.length === 0) {
        setResponse({ data: [] });
        setIsLoading(false);
        return;
      }
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => ref.in('id', memoizedItemIds));
      setResponse(result);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedItemIds]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};

/**
 * Загружает все элементы библиотеки без фильтрации
 */
export const useAllRescueLibrary = () => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<RescueLibraryItemVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => ref);
      setResponse(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};

