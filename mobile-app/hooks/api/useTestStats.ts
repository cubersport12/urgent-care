import { supabase } from '@/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeviceId } from '../use-device-id';
import { AppTestStatsVm } from './types';
import { useSupabaseFetch } from './useSupabaseFetch';

/**
 * Хук для добавления или обновления статистики теста
 * 
 * @param stats - Данные статистики теста (clientId, testId, startedAt, completedAt, passed, scores, data)
 * @returns Объект с функцией для добавления/обновления и состоянием загрузки
 * 
 * @example
 * ```tsx
 * const { addOrUpdate, isLoading, error } = useAddOrUpdateTestStats({
 *   clientId: 'device-id',
 *   testId: 'test-id',
 *   startedAt: new Date().toISOString(),
 *   completedAt: new Date().toISOString(),
 *   passed: true,
 *   scores: 85,
 *   data: { /* дополнительные данные *\/ }
 * });
 * 
 * await addOrUpdate();
 * ```
 */
export const useAddOrUpdateTestStats = (stats: AppTestStatsVm) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addOrUpdate = useCallback(async (updates?: Partial<AppTestStatsVm>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Объединяем базовые данные с обновлениями
      const dataToUpsert: AppTestStatsVm = {
        clientId: stats.clientId,
        testId: stats.testId,
        startedAt: updates?.startedAt ?? stats.startedAt,
        completedAt: updates?.completedAt ?? stats.completedAt,
        passed: updates?.passed ?? stats.passed ?? null,
        data: updates?.data ?? stats.data ?? null,
      };

      // Проверяем, существует ли уже запись
      const { data: existing } = await supabase
        .from('tests_stats')
        .select('*')
        .eq('clientId', stats.clientId)
        .eq('testId', stats.testId)
        .maybeSingle();

      let response;
      if (existing) {
        // Обновляем существующую запись, объединяя с существующими данными
        const dataToUpdate: AppTestStatsVm = {
          ...existing,
          ...dataToUpsert,
          // Сохраняем startedAt из существующей записи, если не передано новое
          startedAt: dataToUpsert.startedAt || existing.startedAt,
        };
        response = await supabase
          .from('tests_stats')
          .update(dataToUpdate)
          .eq('clientId', stats.clientId)
          .eq('testId', stats.testId)
          .select()
          .single();
      } else {
        // Вставляем новую запись
        response = await supabase
          .from('tests_stats')
          .insert(dataToUpsert)
          .select()
          .single();
      }

      if (response.error) {
        throw response.error;
      }

      return response.data as AppTestStatsVm;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add or update test stats');
      setError(error);
      console.error('Error adding or updating test stats:', err);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [stats.clientId, stats.testId, stats.startedAt, stats.completedAt, stats.passed, stats.data]);

  return {
    addOrUpdate,
    isLoading,
    error,
  };
};

/**
 * Хук для получения статистики тестов по списку testIds
 * 
 * @param testsIds - Массив идентификаторов тестов
 * @returns Объект с данными статистики, состоянием загрузки и функцией для обновления
 * 
 * @example
 * ```tsx
 * const testIds = ['test-1', 'test-2'];
 * const { data, isLoading, fetchData } = useTestsStats(testIds);
 * ```
 */
export const useTestsStats = (testsIds: string[]) => {
  const [response, setResponse] = useState<Partial<PostgrestSingleResponse<AppTestStatsVm[]>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { deviceId } = useDeviceId();

  // Мемоизируем testsIds для использования в fetchData
  const memoizedTestsIds = useMemo(() => [...testsIds].sort(), [testsIds]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const r = await useSupabaseFetch('tests_stats', ref => {
        let query = ref.in('testId', memoizedTestsIds);
        if (deviceId) {
          query = query.eq('clientId', deviceId);
        }
        return query;
      });
      setResponse(r);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedTestsIds, deviceId]);

  useEffect(() => {
    if (testsIds.length > 0 && deviceId) {
      void fetchData();
    }
  }, [fetchData, testsIds.length, deviceId]);

  return {
    ...response,
    isLoading,
    fetchData,
  };
};

