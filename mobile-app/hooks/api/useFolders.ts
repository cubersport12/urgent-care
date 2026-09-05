import type { ApiListResponse } from '@/lib/api';
import { apiFetch } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { AppFolderMaterialCountVm, AppFolderVm } from './types';
import { apiFetchRelation } from './useApiFetch';

type ListResponse = Awaited<ReturnType<typeof apiFetchRelation<AppFolderVm>>>;

export const useFolders = (parentId?: string) => {
  const [response, setResponse] = useState<Partial<ListResponse>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiFetchRelation<AppFolderVm>('folders', {
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

/** Счётчики материалов по папкам (вся вложенность) + завершённые, c сервера. */
export const useFoldersMaterialCounts = () => {
  const [response, setResponse] = useState<Partial<ApiListResponse<AppFolderMaterialCountVm>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<AppFolderMaterialCountVm[]>('/api/v1/folders/material-counts');
      setResponse({ data: data ?? [], error: null });
    } catch (e) {
      setResponse({
        data: null,
        error: e instanceof Error ? e : new Error(String(e)),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { ...response, isLoading, fetchData };
};

export const useFolder = (folderId: string) => {
  const [response, setResponse] = useState<Partial<ApiListResponse<AppFolderVm>>>({});

  useEffect(() => {
    const fetchFolder = async () => {
      const result = await apiFetchRelation<AppFolderVm>('folders', { id: folderId });
      setResponse(result);
    };
    void fetchFolder();
  }, [folderId]);
  return {
    ...response,
    data: response.data?.[0],
  };
};

export const useFolderPath = (folderId: string) => {
  const [response, setResponse] = useState<Partial<ApiListResponse<AppFolderVm>>>({});

  useEffect(() => {
    const fId = folderId || '';
    const fetchF = async (id: string): Promise<AppFolderVm | undefined> => {
      return (await apiFetchRelation<AppFolderVm>('folders', { id }))?.data?.[0];
    };
    const fetchPath = async () => {
      let result = await fetchF(fId);
      const path: AppFolderVm[] = result ? [result] : [];
      while (result?.parentId != null) {
        result = await fetchF(result.parentId);
        if (result) path.push(result);
      }
      setResponse({ data: path.reverse(), error: null });
    };
    void fetchPath();
  }, [folderId]);
  return response;
};
