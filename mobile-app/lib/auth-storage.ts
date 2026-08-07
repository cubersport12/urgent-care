import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserOut } from '@/api/generated/types.gen';

const ACCESS_KEY = 'uc_access_token';
const REFRESH_KEY = 'uc_refresh_token';
const USER_KEY = 'uc_user';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let cachedUser: UserOut | null = null;

type AuthListener = (user: UserOut | null) => void;
const listeners = new Set<AuthListener>();

export function onAuthChange(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyAuth() {
  for (const l of listeners) l(cachedUser);
}

export async function loadStoredAuth(): Promise<UserOut | null> {
  try {
    const [a, r, u] = await Promise.all([
      AsyncStorage.getItem(ACCESS_KEY),
      AsyncStorage.getItem(REFRESH_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    accessToken = a;
    refreshToken = r;
    cachedUser = u ? (JSON.parse(u) as UserOut) : null;
    if (cachedUser) cachedUser = { ...cachedUser, id: String(cachedUser.id) };
    return cachedUser;
  } catch {
    return null;
  }
}

export async function persistAuth(tokens: {
  access_token: string;
  refresh_token: string;
  user: UserOut;
}): Promise<void> {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  cachedUser = { ...tokens.user, id: String(tokens.user.id) };
  await Promise.all([
    AsyncStorage.setItem(ACCESS_KEY, accessToken),
    AsyncStorage.setItem(REFRESH_KEY, refreshToken),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(cachedUser)),
  ]);
  notifyAuth();
}

export async function persistAccessToken(token: string): Promise<void> {
  accessToken = token;
  await AsyncStorage.setItem(ACCESS_KEY, token);
}

export async function persistUser(user: UserOut): Promise<void> {
  cachedUser = { ...user, id: String(user.id) };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(cachedUser));
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

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function getCurrentUser(): UserOut | null {
  return cachedUser;
}
