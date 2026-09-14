import { client } from './generated/client.gen';
import { environment } from '../../../environments/environment';

// Храним только идентификатор сессии; авторизация — заголовок X-Session-Id на каждый запрос.
const SESSION_KEY = 'uc_cb_session_id';

const API_BASE = (environment as { apiUrl?: string }).apiUrl ?? 'http://localhost:8000';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/register');
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function redirectToLogin(): void {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

function createAuthFetch(baseFetch: typeof fetch = fetch.bind(globalThis)): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has('X-Session-Id')) {
      const sessionId = getSessionId();
      if (sessionId) headers.set('X-Session-Id', sessionId);
    }
    const response = await baseFetch(input, { ...(init ?? {}), headers });
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // 401 вне логина/регистрации — сессия истекла или отозвана: на форму входа
    if (response.status === 401 && !isAuthEndpoint(url)) {
      clearTokens();
      redirectToLogin();
    }
    return response;
  };
}

export function configureApiClient(): void {
  client.setConfig({
    baseUrl: API_BASE,
    fetch: createAuthFetch()
  });
}

export function setSession(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearTokens(): void {
  localStorage.removeItem(SESSION_KEY);
}

export { client, API_BASE };
