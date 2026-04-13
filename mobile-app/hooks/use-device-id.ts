import { useAuth } from '@/contexts/auth-context';

/**
 * Идентификатор клиента для статистики и API: **id авторизованного пользователя** (Supabase `user.id`).
 * Пока сессия не восстановлена — `isLoading: true`; без входа — `deviceId: null`.
 *
 * @example
 * ```tsx
 * const { deviceId, isLoading } = useDeviceId();
 * await saveStats({ clientId: deviceId ?? '', ... });
 * ```
 */
export function useDeviceId(): { deviceId: string | null; isLoading: boolean } {
  const { user, initialized } = useAuth();

  return {
    deviceId: user?.id ?? null,
    isLoading: !initialized,
  };
}
