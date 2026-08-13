import { Injectable } from '@angular/core';
import {
  articlesCreateArticle,
  articlesDeleteArticle,
  articlesGetArticle,
  articlesListArticles,
  articlesUpdateArticle,
  authLoginJson,
  authMe,
  foldersCreateFolder,
  foldersDeleteFolder,
  foldersGetFolder,
  foldersListFolders,
  foldersUpdateFolder,
  mediaDeleteMedia,
  mediaUploadMedia,
  rescueCreateRescue,
  rescueDeleteRescue,
  rescueGetRescue,
  rescueListRescue,
  rescueUpdateRescue,
  testsCreateTest,
  testsDeleteTest,
  testsGetTest,
  testsListTests,
  testsUpdateTest
} from '@/core/api/generated/sdk.gen';
import {
  API_BASE,
  clearTokens,
  configureApiClient,
  getAccessToken,
  getRefreshToken,
  setTokens
} from '@/core/api/api-client';
import { apiCall } from '@/core/api/api-utils';
import { environment } from '../../../environments/environment';

type EnvWithTestAuth = typeof environment & {
  testAuth?: { email: string; password: string };
};

/** HTTP facade over generated OpenAPI client. */
@Injectable({
  providedIn: 'root'
})
export class AppApi {
  private _ensureAuthPromise: Promise<void> | null = null;

  constructor() {
    configureApiClient();
  }

  get accessToken(): string | null {
    return getAccessToken();
  }

  get isLoggedIn(): boolean {
    return !!getAccessToken();
  }

  ensureAuthenticated(): Promise<void> {
    if (!this._ensureAuthPromise) {
      this._ensureAuthPromise = this._ensureAuthenticated().finally(() => {
        this._ensureAuthPromise = null;
      });
    }
    return this._ensureAuthPromise;
  }

  async login(email: string, password: string): Promise<void> {
    const data = await apiCall(() => authLoginJson({ body: { email, password } }));
    setTokens(data.access_token, data.refresh_token);
    configureApiClient();
  }

  logout(): void {
    clearTokens();
  }

  private async _ensureAuthenticated(): Promise<void> {
    if (getAccessToken()) {
      try {
        await apiCall(() => authMe());
        return;
      } catch {
        if (getRefreshToken()) {
          // refresh handled inside client fetch; retry me once after configure
          configureApiClient();
          try {
            await apiCall(() => authMe());
            return;
          } catch {
            clearTokens();
          }
        } else {
          clearTokens();
        }
      }
    }

    const testAuth = (environment as EnvWithTestAuth).testAuth;
    if (!testAuth?.email || !testAuth?.password) {
      throw new Error('Not authenticated and no testAuth credentials in environment');
    }
    await this.login(testAuth.email, testAuth.password);
  }

  list<T>(resource: string, opts?: { parentId?: string | null; all?: boolean; id?: string }): Promise<T[]> {
    const query =
      opts?.all
        ? { all: true as const }
        : opts && 'parentId' in opts && opts.parentId != null && opts.parentId.length > 0
          ? { parentId: opts.parentId }
          : {};

    switch (resource) {
      case 'folders':
        if (opts?.id) {
          return apiCall(() => foldersGetFolder({ path: { item_id: opts.id! } })).then((x) => [x as T]);
        }
        return apiCall(() => foldersListFolders({ query })).then((x) => x as T[]);
      case 'articles':
        if (opts?.id) {
          return apiCall(() => articlesGetArticle({ path: { item_id: opts.id! } })).then((x) => [x as T]);
        }
        return apiCall(() => articlesListArticles({ query })).then((x) => x as T[]);
      case 'tests':
        if (opts?.id) {
          return apiCall(() => testsGetTest({ path: { item_id: opts.id! } })).then((x) => [x as T]);
        }
        return apiCall(() => testsListTests({ query })).then((x) => x as T[]);
      case 'rescue':
        if (opts?.id) {
          return apiCall(() => rescueGetRescue({ path: { item_id: opts.id! } })).then((x) => [x as T]);
        }
        return apiCall(() => rescueListRescue({ query })).then((x) => x as T[]);
      default:
        return Promise.reject(new Error(`Unknown resource: ${resource}`));
    }
  }

  create<T>(resource: string, body: unknown): Promise<T> {
    switch (resource) {
      case 'folders':
        return apiCall(() => foldersCreateFolder({ body: body as never })) as Promise<T>;
      case 'articles':
        return apiCall(() => articlesCreateArticle({ body: body as never })) as Promise<T>;
      case 'tests':
        return apiCall(() => testsCreateTest({ body: body as never })) as Promise<T>;
      case 'rescue':
        return apiCall(() => rescueCreateRescue({ body: body as never })) as Promise<T>;
      default:
        return Promise.reject(new Error(`Unknown resource: ${resource}`));
    }
  }

  update<T>(resource: string, id: string, body: unknown): Promise<T> {
    switch (resource) {
      case 'folders':
        return apiCall(() => foldersUpdateFolder({ path: { item_id: id }, body: body as never })) as Promise<T>;
      case 'articles':
        return apiCall(() => articlesUpdateArticle({ path: { item_id: id }, body: body as never })) as Promise<T>;
      case 'tests':
        return apiCall(() => testsUpdateTest({ path: { item_id: id }, body: body as never })) as Promise<T>;
      case 'rescue':
        return apiCall(() => rescueUpdateRescue({ path: { item_id: id }, body: body as never })) as Promise<T>;
      default:
        return Promise.reject(new Error(`Unknown resource: ${resource}`));
    }
  }

  delete(resource: string, id: string): Promise<void> {
    switch (resource) {
      case 'folders':
        return apiCall(() => foldersDeleteFolder({ path: { item_id: id } })) as Promise<void>;
      case 'articles':
        return apiCall(() => articlesDeleteArticle({ path: { item_id: id } })) as Promise<void>;
      case 'tests':
        return apiCall(() => testsDeleteTest({ path: { item_id: id } })) as Promise<void>;
      case 'rescue':
        return apiCall(() => rescueDeleteRescue({ path: { item_id: id } })) as Promise<void>;
      default:
        return Promise.reject(new Error(`Unknown resource: ${resource}`));
    }
  }

  async uploadFile(fileName: string, blob: Blob): Promise<string> {
    const named =
      blob instanceof File && blob.name === fileName
        ? blob
        : new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
    const res = await apiCall(() =>
      mediaUploadMedia({
        body: {
          file: named,
          file_name: fileName
        }
      })
    );
    return res['path'] ?? `public/${fileName}`;
  }

  async deleteFile(fileName: string): Promise<void> {
    const path = fileName.startsWith('public/') ? fileName : `public/${fileName}`;
    await apiCall(() => mediaDeleteMedia({ path: { file_path: path } }));
  }

  async downloadFile(fileName: string): Promise<Blob> {
    const path = fileName.startsWith('public/') ? fileName : `public/${fileName}`;
    const headers = new Headers();
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(`${API_BASE}/api/v1/media/${path}`, { headers });
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status}`);
    }
    return res.blob();
  }
}
