import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const API_BASE = (environment as { apiUrl?: string }).apiUrl ?? 'http://localhost:8000';
const ACCESS_KEY = 'uc_cb_access_token';
const REFRESH_KEY = 'uc_cb_refresh_token';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; role: string };
};

type EnvWithTestAuth = typeof environment & {
  testAuth?: { email: string; password: string };
};

/**
 * HTTP client for Urgent Care API (replaces Supabase JS client).
 * Kept as AppSupabase for existing inject sites.
 */
@Injectable({
  providedIn: 'root'
})
export class AppSupabase {
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private _ensureAuthPromise: Promise<void> | null = null;

  constructor() {
    this._accessToken = localStorage.getItem(ACCESS_KEY);
    this._refreshToken = localStorage.getItem(REFRESH_KEY);
  }

  get accessToken(): string | null {
    return this._accessToken;
  }

  get isLoggedIn(): boolean {
    return !!this._accessToken;
  }

  /**
   * Restore stored session or sign in with environment testAuth credentials.
   */
  ensureAuthenticated(): Promise<void> {
    if (!this._ensureAuthPromise) {
      this._ensureAuthPromise = this._ensureAuthenticated().finally(() => {
        this._ensureAuthPromise = null;
      });
    }
    return this._ensureAuthPromise;
  }

  async login(email: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      throw new Error(`Login failed: ${res.status}`);
    }
    const data = (await res.json()) as TokenResponse;
    this._persistTokens(data.access_token, data.refresh_token);
  }

  logout(): void {
    this._accessToken = null;
    this._refreshToken = null;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  private async _ensureAuthenticated(): Promise<void> {
    if (this._accessToken) {
      const valid = await this._validateSession();
      if (valid) {
        return;
      }
      this.logout();
    }

    const testAuth = (environment as EnvWithTestAuth).testAuth;
    if (!testAuth?.email || !testAuth?.password) {
      throw new Error('Not authenticated and no testAuth credentials in environment');
    }
    await this.login(testAuth.email, testAuth.password);
  }

  private async _validateSession(): Promise<boolean> {
    try {
      await this._request<{ id: string }>('/api/v1/auth/me', {}, false);
      return true;
    } catch {
      if (this._refreshToken) {
        try {
          await this._refreshAccessToken();
          await this._request<{ id: string }>('/api/v1/auth/me', {}, false);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  private async _refreshAccessToken(): Promise<void> {
    if (!this._refreshToken) {
      throw new Error('No refresh token');
    }
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this._refreshToken })
    });
    if (!res.ok) {
      throw new Error(`Refresh failed: ${res.status}`);
    }
    const data = (await res.json()) as { access_token: string };
    this._persistTokens(data.access_token, this._refreshToken);
  }

  private _persistTokens(access: string, refresh: string): void {
    this._accessToken = access;
    this._refreshToken = refresh;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  private async _request<T>(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (this._accessToken) {
      headers.set('Authorization', `Bearer ${this._accessToken}`);
    }
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

    if (res.status === 401 && retryOnUnauthorized && this._refreshToken) {
      try {
        await this._refreshAccessToken();
        return this._request<T>(path, init, false);
      } catch {
        // fall through to error handling
      }
    }

    if (res.status === 204) {
      return undefined as T;
    }
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const detail = body?.detail ?? res.statusText;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    return body as T;
  }

  list<T>(resource: string, opts?: { parentId?: string | null; all?: boolean; id?: string }): Promise<T[]> {
    if (opts?.id) {
      return this._request<T>(`/api/v1/${resource}/${opts.id}`).then((item) => (item ? [item] : []));
    }
    const params = new URLSearchParams();
    if (opts?.all) {
      params.set('all', 'true');
    } else if (opts && 'parentId' in opts) {
      if (opts.parentId != null && opts.parentId.length > 0) {
        params.set('parentId', opts.parentId);
      }
    }
    const qs = params.toString();
    return this._request<T[]>(`/api/v1/${resource}${qs ? `?${qs}` : ''}`);
  }

  create<T>(resource: string, body: unknown): Promise<T> {
    return this._request<T>(`/api/v1/${resource}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  update<T>(resource: string, id: string, body: unknown): Promise<T> {
    return this._request<T>(`/api/v1/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  delete(resource: string, id: string): Promise<void> {
    return this._request<void>(`/api/v1/${resource}/${id}`, { method: 'DELETE' });
  }

  async uploadFile(fileName: string, blob: Blob): Promise<string> {
    const form = new FormData();
    form.append('file', blob, fileName);
    form.append('fileName', fileName);
    const res = await this._request<{ path: string; fileName: string }>('/api/v1/media', {
      method: 'POST',
      body: form
    });
    return res.path;
  }

  async deleteFile(fileName: string): Promise<void> {
    const path = fileName.startsWith('public/') ? fileName : `public/${fileName}`;
    await this._request<void>(`/api/v1/media/${path}`, { method: 'DELETE' });
  }

  async downloadFile(fileName: string): Promise<Blob> {
    const path = fileName.startsWith('public/') ? fileName : `public/${fileName}`;
    const headers = new Headers();
    if (this._accessToken) {
      headers.set('Authorization', `Bearer ${this._accessToken}`);
    }
    let res = await fetch(`${API_BASE}/api/v1/media/${path}`, { headers });
    if (res.status === 401 && this._refreshToken) {
      await this._refreshAccessToken();
      headers.set('Authorization', `Bearer ${this._accessToken}`);
      res = await fetch(`${API_BASE}/api/v1/media/${path}`, { headers });
    }
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status}`);
    }
    return res.blob();
  }
}
