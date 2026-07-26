import { useAuth } from '@/contexts/auth-context';

/**
 * Идентификатор клиента для статистики и API: id авторизованного пользователя.
 * Пока сессия не восстановлена — `isLoading: true`; без входа — `deviceId: null`.
 */
export function useDeviceId(): { deviceId: string | null; isLoading: boolean } {
  const { user, initialized } = useAuth();

  return {
    deviceId: user?.id != null ? String(user.id) : null,
    isLoading: !initialized,
  };
}
