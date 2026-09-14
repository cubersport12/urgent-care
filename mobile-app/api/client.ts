import { Platform } from 'react-native';
import { client } from '@/api/generated/client.gen';
import { clearAuth, getSessionId } from '@/lib/auth-storage';

// Dev: emulator/simulator loopback. Release: production (override with EXPO_PUBLIC_API_URL).
const DEFAULT_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000'
  : 'https://trouble-dent.ru';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL
).replace(/\/$/, '');

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return url.includes('/auth/login') || url.includes('/auth/register');
}

function createAuthFetch(baseFetch: typeof fetch = globalThis.fetch.bind(globalThis)): typeof fetch {
  return async (input, init) => {
    // Полный набор заголовков: из init, из самого Request (hey-api передаёт fetch(request))
    // и X-Session-Id. Нельзя передавать только {X-Session-Id} — по спецификации
    // init.headers ЗАМЕНЯЕТ заголовки Request, и запрос теряет Content-Type.
    const headers = new Headers(init?.headers);
    if (input instanceof Request) {
      input.headers.forEach((value, key) => {
        if (!headers.has(key)) headers.set(key, value);
      });
    }
    if (!headers.has('X-Session-Id')) {
      const sessionId = getSessionId();
      if (sessionId) headers.set('X-Session-Id', sessionId);
    }
    const response = await baseFetch(input, { ...(init ?? {}), headers });
    // 401 вне логина/регистрации — сессия истекла или отозвана (логин на другом устройстве)
    if (response.status === 401 && !isAuthEndpoint(input)) {
      await clearAuth();
    }
    return response;
  };
}

const authFetch = createAuthFetch();

export function configureApiClient(): void {
  client.setConfig({
    baseUrl: API_BASE_URL,
    fetch: authFetch,
  });
}

export { client, authFetch };
