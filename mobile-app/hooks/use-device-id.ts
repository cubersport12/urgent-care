import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@device_id';

/**
 * Генерирует UUID v4
 */
function generateUUID(): string {
  // Для веб используем crypto API, для нативных платформ - простую генерацию
  if (Platform.OS === 'web' && typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback генерация UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Получает сохраненный идентификатор устройства из хранилища
 */
async function getStoredDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // Для веб используем localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(DEVICE_ID_KEY);
      }
      return null;
    } else {
      // Для нативных платформ используем AsyncStorage
      return await AsyncStorage.getItem(DEVICE_ID_KEY);
    }
  } catch (error) {
    console.error('Error reading device ID:', error);
    return null;
  }
}

/**
 * Сохраняет идентификатор устройства в хранилище
 */
async function saveDeviceId(deviceId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Для веб используем localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
    } else {
      // Для нативных платформ используем AsyncStorage
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch (error) {
    console.error('Error saving device ID:', error);
    throw error;
  }
}

/**
 * Хук для получения идентификатора устройства
 * 
 * @returns {string | null} Идентификатор устройства или null во время загрузки
 * @returns {boolean} isLoading - Состояние загрузки
 * 
 * @example
 * ```tsx
 * const { deviceId, isLoading } = useDeviceId();
 * 
 * if (isLoading) {
 *   return <Text>Загрузка...</Text>;
 * }
 * 
 * // Использование deviceId для сохранения статистики
 * await saveStats({ deviceId, ...otherData });
 * ```
 */
export function useDeviceId(): { deviceId: string | null; isLoading: boolean } {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeDeviceId = async () => {
      try {
        // Пытаемся получить сохраненный ID
        const storedId = await getStoredDeviceId();

        if (storedId) {
          // Если ID найден, используем его
          if (isMounted) {
            setDeviceId(storedId);
            setIsLoading(false);
          }
        } else {
          // Если ID не найден, генерируем новый
          const newId = generateUUID();
          await saveDeviceId(newId);

          if (isMounted) {
            setDeviceId(newId);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing device ID:', error);
        // В случае ошибки генерируем временный ID, но не сохраняем его
        // Это позволит приложению работать, но ID будет меняться при перезапуске
        if (isMounted) {
          const tempId = generateUUID();
          setDeviceId(tempId);
          setIsLoading(false);
        }
      }
    };

    void initializeDeviceId();

    return () => {
      isMounted = false;
    };
  }, []);

  return { deviceId, isLoading };
}
