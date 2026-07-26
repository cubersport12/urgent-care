import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL
).replace(/\/$/, '');

const ACCESS_KEY = 'uc_access_token';
const REFRESH_KEY = 'uc_refresh_token';
const USER_KEY = 'uc_user';

export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type ApiListResponse<T> = {
  data: T[] | null;
  error: Error | null;
};

export type ApiSingleResponse<T> = {
  data: T | null;
  error: Error | null;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let cachedUser: ApiUser | null = null;

type AuthListener = (user: ApiUser | null) => void;
const listeners = new Set<AuthListener>();

export function onAuthChange(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyAuth() {
  for (const l of listeners) {
    l(cachedUser);
  }
}

export async function loadStoredAuth(): Promise<ApiUser | null> {
  try {
    const [a, r, u] = await Promise.all([
      AsyncStorage.getItem(ACCESS_KEY),
      AsyncStorage.getItem(REFRESH_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    accessToken = a;
    refreshToken = r;
    cachedUser = u ? (JSON.parse(u) as ApiUser) : null;
    return cachedUser;
  } catch {
    return null;
  }
}

export async function persistAuth(tokens: {
  access_token: string;
  refresh_token: string;
  user: ApiUser;
}): Promise<void> {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  cachedUser = {
    ...tokens.user,
    id: String(tokens.user.id),
  };
  await Promise.all([
    AsyncStorage.setItem(ACCESS_KEY, accessToken),
    AsyncStorage.setItem(REFRESH_KEY, refreshToken),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(cachedUser)),
  ]);
  notifyAuth();
}

export async function clearAuth(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  cachedUser = null;
  await Promise.all([
    AsyncStorage.removeItem(ACCESS_KEY),
    AsyncStorage.removeItem(REFRESH_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
  notifyAuth();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCurrentUser(): ApiUser | null {
  return cachedUser;
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token: string };
    accessToken = data.access_token;
    await AsyncStorage.setItem(ACCESS_KEY, accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401 && retry && refreshToken) {
    const ok = await tryRefresh();
    if (ok) return apiFetch<T>(path, init, false);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const detail =
      typeof body === 'object' && body && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText;
    throw new Error(detail || `HTTP ${res.status}`);
  }

  return body as T;
}

export async function apiGetList<T>(path: string): Promise<ApiListResponse<T>> {
  try {
    const data = await apiFetch<T[]>(path);
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function downloadMediaBlob(fileName: string): Promise<Blob> {
  const path = fileName.startsWith('public/') ? fileName : `public/${fileName}`;
  const headers = new Headers();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(`${API_BASE_URL}/api/v1/media/${path}`, { headers });
  if (!res.ok) throw new Error(`File not found: ${fileName}`);
  return res.blob();
}
