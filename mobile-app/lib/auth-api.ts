import {
  authForgotPassword,
  authLoginJson,
  authRegister,
  authResetPassword,
  authUpdateMe,
} from '@/api/generated/sdk.gen';
import { apiCall } from '@/api/utils';
import { clearAuth, persistAuth, persistUser } from '@/lib/auth-storage';
import type { Token, UserOut } from '@/api/generated/types.gen';

export async function login(email: string, password: string): Promise<Token> {
  const data = await apiCall(() =>
    authLoginJson({ body: { email, password } }),
  );
  await persistAuth(data);
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  cityId?: string | null,
): Promise<Token> {
  const data = await apiCall(() =>
    authRegister({
      body: {
        email,
        password,
        full_name: fullName,
        name: fullName,
        city_id: cityId ?? null,
      },
    }),
  );
  await persistAuth(data);
  return data;
}

export async function updateMe(fields: {
  full_name?: string | null;
  city_id?: string | null;
}): Promise<UserOut> {
  const body: { full_name?: string | null; city_id?: string | null } = {};
  if (fields.full_name !== undefined) body.full_name = fields.full_name;
  if (fields.city_id !== undefined) body.city_id = fields.city_id;
  const user = await apiCall(() => authUpdateMe({ body }));
  await persistUser(user);
  return user;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiCall(() => authForgotPassword({ body: { email } }));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiCall(() => authResetPassword({ body: { token, password } }));
}

export async function signOut(): Promise<void> {
  await clearAuth();
}
