import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserOut } from '@/api/generated/types.gen';

// Храним только идентификатор сессии + кэш юзера; access-токенов больше нет —
// авторизация идёт заголовком X-Session-Id на каждый запрос.
const SESSION_KEY = 'uc_session_id';
const USER_KEY = 'uc_user';

let sessionId: string | null = null;
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
    const [s, u] = await Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(USER_KEY)]);
    sessionId = s;
    cachedUser = u ? (JSON.parse(u) as UserOut) : null;
    if (cachedUser) cachedUser = { ...cachedUser, id: String(cachedUser.id) };
    return cachedUser;
  } catch {
    return null;
  }
}

export async function persistAuth(tokens: {
  session_id: string;
  user: UserOut;
}): Promise<void> {
  sessionId = tokens.session_id;
  cachedUser = { ...tokens.user, id: String(tokens.user.id) };
  await Promise.all([
    AsyncStorage.setItem(SESSION_KEY, sessionId),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(cachedUser)),
  ]);
  notifyAuth();
}

export async function persistUser(user: UserOut): Promise<void> {
  cachedUser = { ...user, id: String(user.id) };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(cachedUser));
  notifyAuth();
}

export async function clearAuth(): Promise<void> {
  sessionId = null;
  cachedUser = null;
  await Promise.all([AsyncStorage.removeItem(SESSION_KEY), AsyncStorage.removeItem(USER_KEY)]);
  notifyAuth();
}

export function getSessionId(): string | null {
  return sessionId;
}

export function getCurrentUser(): UserOut | null {
  return cachedUser;
}
