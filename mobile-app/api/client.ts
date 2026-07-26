import { Platform } from 'react-native';
import { client } from '@/api/generated/client.gen';
import { getAccessToken, getRefreshToken, persistAccessToken, clearAuth } from '@/lib/auth-storage';

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL
).replace(/\/$/, '');

let refreshing: Promise<boolean> | null = null;

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  );
}

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await globalThis.fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { access_token: string };
      await persistAccessToken(data.access_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function createAuthFetch(baseFetch: typeof fetch = globalThis.fetch.bind(globalThis)): typeof fetch {
  return async (input, init) => {
    let response = await baseFetch(input, init);
    if (response.status === 401 && !isAuthEndpoint(input)) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        const token = getAccessToken();
        const headers = new Headers(init?.headers);
        if (token) headers.set('Authorization', `Bearer ${token}`);
        response = await baseFetch(input, { ...init, headers });
      } else {
        await clearAuth();
      }
    }
    return response;
  };
}

const authFetch = createAuthFetch();

export function configureApiClient(): void {
  client.setConfig({
    baseUrl: API_BASE_URL,
    auth: () => getAccessToken() ?? undefined,
    fetch: authFetch,
  });
}

export { client, authFetch };
