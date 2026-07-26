import { client } from './generated/client.gen';
import { environment } from '../../../environments/environment';

const ACCESS_KEY = 'uc_cb_access_token';
const REFRESH_KEY = 'uc_cb_refresh_token';

const API_BASE = (environment as { apiUrl?: string }).apiUrl ?? 'http://localhost:8000';

let accessToken: string | null = localStorage.getItem(ACCESS_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);
let refreshing: Promise<boolean> | null = null;

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  );
}

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { access_token: string };
      accessToken = data.access_token;
      localStorage.setItem(ACCESS_KEY, accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function createAuthFetch(baseFetch: typeof fetch = fetch.bind(globalThis)): typeof fetch {
  return async (input, init) => {
    let response = await baseFetch(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (response.status === 401 && !isAuthEndpoint(url)) {
      const ok = await tryRefresh();
      if (ok) {
        const headers = new Headers(init?.headers);
        if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
        response = await baseFetch(input, { ...init, headers });
      }
    }
    return response;
  };
}

export function configureApiClient(): void {
  client.setConfig({
    baseUrl: API_BASE,
    auth: () => accessToken ?? undefined,
    fetch: createAuthFetch()
  });
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export { client, API_BASE };
