import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiListResponse } from '@/lib/api';
import { apiFetchRelation } from './useApiFetch';

/** A response belongs to one folder; late responses must not replace the current folder. */
export function useFolderContent<T>(relation: string, parentId?: string) {
  const folderKey = parentId || '';
  const currentFolder = useRef(folderKey);
  currentFolder.current = folderKey;
  const requestVersion = useRef(0);
  const [state, setState] = useState<{
    folderKey: string;
    response: Partial<ApiListResponse<T>>;
    isLoading: boolean;
  }>({ folderKey, response: {}, isLoading: true });

  const fetchData = useCallback(async () => {
    if (currentFolder.current !== folderKey) return;
    const version = ++requestVersion.current;
    setState({ folderKey, response: {}, isLoading: true });
    const response = await apiFetchRelation<T>(relation, { parentId: folderKey || null });
    if (requestVersion.current === version && currentFolder.current === folderKey) {
      setState({ folderKey, response, isLoading: false });
    }
  }, [folderKey, relation]);

  const invalidate = useCallback(() => { requestVersion.current++; }, []);
  useEffect(() => {
    void fetchData();
    return invalidate;
  }, [fetchData, invalidate]);

  return state.folderKey === folderKey
    ? { ...state.response, isLoading: state.isLoading, fetchData }
    : { data: undefined, error: undefined, isLoading: true, fetchData };
}
