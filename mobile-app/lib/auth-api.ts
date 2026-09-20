import {
  authDeleteAvatar,
  authDeleteMe,
  authForgotPassword,
  authListSessions,
  authLoginJson,
  authLogout,
  authRegister,
  authRequestLoginCode,
  authResendVerification,
  authResetPassword,
  authUpdateMe,
  authUploadAvatar,
  authVerifyEmail,
  authVerifyLoginCode,
} from '@/api/generated/sdk.gen';
import { apiCall } from '@/api/utils';
import { clearAuth, getSessionId, persistAuth, persistUser } from '@/lib/auth-storage';
import { registerPushToken, unregisterPushToken } from '@/lib/push-notifications';
import type { SessionCreated, SessionOut, UserOut } from '@/api/generated/types.gen';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

function deviceName(): string {
  if (Platform.OS === 'web') return 'Браузер';
  return [Device.deviceName, Device.modelName].find(Boolean) || Platform.OS;
}

export async function login(email: string, password: string): Promise<SessionCreated> {
  const data = await apiCall(() =>
    authLoginJson({ body: { email, password, device_name: deviceName() } }),
  );
  await persistAuth(data);
  void registerPushToken();
  return data;
}

/** Регистрация: сессия не выдаётся — ждём подтверждения почты из письма. */
export async function register(email: string, password: string): Promise<void> {
  await apiCall(() => authRegister({ body: { email, password } }));
}

export async function verifyEmail(token: string): Promise<void> {
  await apiCall(() => authVerifyEmail({ body: { token } }));
}

export async function resendVerification(email: string): Promise<void> {
  await apiCall(() => authResendVerification({ body: { email } }));
}

export async function requestLoginCode(email: string): Promise<void> {
  await apiCall(() => authRequestLoginCode({ body: { email } }));
}

export async function loginWithCode(email: string, code: string): Promise<SessionCreated> {
  const data = await apiCall(() =>
    authVerifyLoginCode({ body: { email, code, device_name: deviceName() } }),
  );
  await persistAuth(data);
  void registerPushToken();
  return data;
}

export async function updateMe(fields: {
  full_name?: string | null;
  city_id?: string | null;
  birth_year?: number | null;
  occupation?: string | null;
}): Promise<UserOut> {
  const body: {
    full_name?: string | null;
    city_id?: string | null;
    birth_year?: number | null;
    occupation?: string | null;
  } = {};
  if (fields.full_name !== undefined) body.full_name = fields.full_name;
  if (fields.city_id !== undefined) body.city_id = fields.city_id;
  if (fields.birth_year !== undefined) body.birth_year = fields.birth_year;
  if (fields.occupation !== undefined) body.occupation = fields.occupation;
  const user = await apiCall(() => authUpdateMe({ body }));
  await persistUser(user);
  return user;
}

export async function uploadAvatar(uri: string): Promise<UserOut> {
  const blob = await (await fetch(uri)).blob();
  const user = await apiCall(() => authUploadAvatar({ body: { file: blob } }));
  await persistUser(user);
  return user;
}

export async function deleteAvatar(): Promise<UserOut> {
  const user = await apiCall(() => authDeleteAvatar());
  await persistUser(user);
  return user;
}

export async function fetchSessions(): Promise<SessionOut[]> {
  return apiCall(() => authListSessions());
}

export async function forgotPassword(email: string): Promise<void> {
  await apiCall(() => authForgotPassword({ body: { email } }));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiCall(() => authResetPassword({ body: { token, password } }));
}

export async function signOut(): Promise<void> {
  const sessionId = getSessionId();
  if (sessionId) {
    try {
      await apiCall(() => authLogout({ body: { session_id: sessionId } }));
    } catch {
      // сессия уже неактивна/сеть недоступна — локально всё равно разлогиниваемся
    }
  }
  await unregisterPushToken();
  await clearAuth();
}

/** 152-ФЗ: необратимое удаление аккаунта со всеми данными. */
export async function deleteAccount(password: string): Promise<void> {
  await apiCall(() => authDeleteMe({ body: { password } }));
  await unregisterPushToken();
  await clearAuth();
}
