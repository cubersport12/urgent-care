import {
  apiFetch,
  clearAuth,
  persistAuth,
  type ApiUser,
} from '@/lib/api';

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: ApiUser;
};

export async function login(email: string, password: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>('/api/v1/auth/login/json', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await persistAuth(data);
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      name: fullName,
    }),
  });
  await persistAuth(data);
  return data;
}

export async function signOut(): Promise<void> {
  await clearAuth();
}

export async function fetchMe(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/v1/auth/me');
}
