import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiListResponse } from '@/lib/api';
import { useDeviceId } from '../use-device-id';
import { apiFetchRelation } from './useApiFetch';

/** Keep progress tied to the material IDs it was requested for. */
export function useContentStats<T>(relation: string, ids: string[], idField: keyof T) {
  const { deviceId } = useDeviceId();
  const idsKey = JSON.stringify([...ids].sort());
  const selectedIds = useMemo(() => JSON.parse(idsKey) as string[], [idsKey]);
  const queryKey = `${deviceId ?? ''}:${idsKey}`;
  const currentQuery = useRef(queryKey);
  currentQuery.current = queryKey;
  const requestVersion = useRef(0);
  const [state, setState] = useState<{
    queryKey: string;
    response: Partial<ApiListResponse<T>>;
    isLoading: boolean;
  }>({ queryKey: '', response: {}, isLoading: true });

  const fetchData = useCallback(async () => {
    if (currentQuery.current !== queryKey || !selectedIds.length || !deviceId) return;
    const version = ++requestVersion.current;
    setState({ queryKey, response: {}, isLoading: true });
    const response = await apiFetchRelation<T>(relation);
    if (requestVersion.current === version && currentQuery.current === queryKey) {
      setState({
        queryKey,
        response: {
          data: response.data?.filter((item) => selectedIds.includes(item[idField] as string)) ?? null,
          error: response.error,
        },
        isLoading: false,
      });
    }
  }, [deviceId, idField, queryKey, relation, selectedIds]);

  const invalidate = useCallback(() => { requestVersion.current++; }, []);
  useEffect(() => {
    void fetchData();
    return invalidate;
  }, [fetchData, invalidate]);

  if (!selectedIds.length) return { data: [] as T[], error: null, isLoading: false, fetchData };
  return state.queryKey === queryKey
    ? { ...state.response, isLoading: state.isLoading, fetchData }
    : { data: undefined, error: undefined, isLoading: true, fetchData };
}
