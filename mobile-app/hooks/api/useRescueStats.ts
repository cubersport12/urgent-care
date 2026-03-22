import { supabase } from '@/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeviceId } from '../use-device-id';
import { AppRescueStatsVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

type RescueStatsKeys = Pick<AppRescueStatsVm, 'clientId' | 'rescueId'>;

type RescueStatsPatch = Partial<
  Pick<AppRescueStatsVm, 'startedAt' | 'completedAt' | 'passed' | 'data' | 'id'>
>;

/**
 * Хук для добавления или обновления статистики режима спасения
 * (по сути как {@link useAddOrUpdateArticleStats}: один `upsert` по паре `clientId` + `rescueId`).
 *
 * @param keys - `clientId` и `rescueId`
 * @returns `addOrUpdate(patch)` — дополняет/перезаписывает поля и выполняет upsert в `rescue_stats`
 *
 * @example
 * ```tsx
 * const { addOrUpdate, isLoading, error } = useAddOrUpdateRescueStats({
 *   clientId: deviceId ?? '',
 *   rescueId: rescueItem.id,
 * });
 *
 * await addOrUpdate({ startedAt: new Date().toISOString() });
 * await addOrUpdate({ completedAt: new Date().toISOString(), passed: true });
 * ```
 */
export const useAddOrUpdateRescueStats = (keys: RescueStatsKeys) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addOrUpdate = useCallback(
    async (patch: RescueStatsPatch) => {
      if (!keys.clientId || !keys.rescueId) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: existing, error: selErr } = await supabase
          .from('rescue_stats')
          .select('*')
          .eq('clientId', keys.clientId)
          .eq('rescueId', keys.rescueId)
          .maybeSingle();

        if (selErr) {
          throw selErr;
        }

        const row = existing as AppRescueStatsVm | null;

        const isNewSession =
          patch.startedAt !== undefined && patch.completedAt === undefined;

        let startedAt = row?.startedAt;
        let completedAt = row?.completedAt ?? null;
        let passed = row?.passed ?? null;
        let data: AppRescueStatsVm['data'] = row?.data ?? null;
        const id = patch.id ?? row?.id;

        if (isNewSession) {
          startedAt = patch.startedAt;
          completedAt = null;
          passed = null;
          if (patch.data !== undefined) {
            data = patch.data;
          }
        } else {
          if (patch.startedAt !== undefined) {
            startedAt = patch.startedAt;
          }
          if (patch.completedAt !== undefined) {
            completedAt = patch.completedAt;
          }
          if (patch.passed !== undefined) {
            passed = patch.passed;
          }
          if (patch.data !== undefined) {
            data = patch.data;
          }
        }

        const finalStartedAt = startedAt ?? patch.completedAt ?? new Date().toISOString();

        const dataToUpsert: AppRescueStatsVm = {
          ...(id ? { id } : {}),
          clientId: keys.clientId,
          rescueId: keys.rescueId,
          startedAt: finalStartedAt,
          completedAt,
          passed,
          data,
        };

        const response = await supabase
          .from('rescue_stats')
          .upsert(dataToUpsert, {
            onConflict: 'clientId,rescueId',
          })
          .select()
          .single();

        if (response.error) {
          throw response.error;
        }

        return response.data as AppRescueStatsVm;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to add or update rescue stats');
        setError(e);
        console.error('Error adding or updating rescue stats:', err);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [keys.clientId, keys.rescueId],
  );

  return {
    addOrUpdate,
    isLoading,
    error,
  };
};

/**
 * Статистика rescue по списку id для текущего устройства (clientId).
 */
export const useRescuesStats = (rescueIds: string[]) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppRescueStatsVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { deviceId } = useDeviceId();

  const memoizedIds = useMemo(() => [...rescueIds].sort(), [rescueIds]);

  const fetchData = useCallback(async () => {
    if (memoizedIds.length === 0) {
      setResponse({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- как в useArticlesStats / useTestsStats
      const r = await useSupabaseFetch('rescue_stats', (ref) => {
        let query = ref.in('rescueId', memoizedIds);
        if (deviceId) {
          query = query.eq('clientId', deviceId);
        }
        return query;
      });
      setResponse(r);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedIds, deviceId]);

  useEffect(() => {
    if (rescueIds.length > 0 && deviceId) {
      void fetchData();
    }
  }, [fetchData, rescueIds.length, deviceId]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};
