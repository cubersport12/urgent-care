import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { AppFolderVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

const RELATION_NAME = 'folders';

export const useFolders = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppFolderVm[]>>>({});
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

export const useFolder = (folderId: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppFolderVm[]>>>({});

  useEffect(() => {
    const fetchFolder = async () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useSupabaseFetch(RELATION_NAME, ref => ref.filter('id', 'eq', folderId));
      setResponse(result);
    };
    void fetchFolder();
  }, [folderId]);
  return {
    ...response,
    data: response.data?.[0]
  };
};

export const useFolderPath = (folderId: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppFolderVm[]>>>({});

  useEffect(() => {
    const fId = folderId || '';
    const fetchF = async (id: string): Promise<AppFolderVm> => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return (await useSupabaseFetch(RELATION_NAME, ref => ref.filter('id', 'eq', id)))?.data?.[0];
    };
    const fetchPath = async () => {
      let result = await fetchF(fId);
      const path: AppFolderVm[] = [result];
      while (result?.parentId != null) {
        result = await fetchF(result.parentId);
        path.push(result);
      }
      setResponse({ data: path.reverse() });
    };
    void fetchPath();
  }, [folderId]);
  return response;
};
