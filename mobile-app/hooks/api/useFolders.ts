import { useEffect, useState } from 'react';
import { useSupabaseFetch } from './useSupabaseFetch';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { AppFolderVm } from './types';

const RELATION_NAME = 'folders';

export const useFolders = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppFolderVm[]>>>({});

  useEffect(() => {
    const fetchFolders = async () => {
      const result = await useSupabaseFetch(RELATION_NAME, ref => parentId?.length ? ref.filter('parentId', 'eq', parentId ?? '') : ref.filter('parentId', 'is', null));
      setResponse(result);
    };
    void fetchFolders();
  }, [parentId]);
  return response;
};

export const useFolder = (folderId: string) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppFolderVm[]>>>({});

  useEffect(() => {
    const fetchFolder = async () => {
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
    const fId = folderId;
    const fetchF = async (id: string): Promise<AppFolderVm> => {
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
  }, [folderId ?? '']);
  return response;
};
