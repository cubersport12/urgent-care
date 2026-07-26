import { authLoginJson, authRegister } from '@/api/generated/sdk.gen';
import { apiCall } from '@/api/utils';
import { clearAuth, persistAuth } from '@/lib/auth-storage';
import type { Token } from '@/api/generated/types.gen';

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
): Promise<Token> {
  const data = await apiCall(() =>
    authRegister({
      body: {
        email,
        password,
        full_name: fullName,
        name: fullName,
      },
    }),
  );
  await persistAuth(data);
  return data;
}

export async function signOut(): Promise<void> {
  await clearAuth();
}
