/**
 * Thin compatibility layer + media helpers over generated OpenAPI client.
 */
import { API_BASE_URL, authFetch } from '@/api/client';
import {
  articlesGetArticle,
  articlesListArticles,
  foldersGetFolder,
  foldersListFolders,
  rescueGetRescue,
  rescueListRescue,
  statsListArticleStats,
  statsListRescueStats,
  statsListTestResults,
  statsListTestStats,
  testsGetTest,
  testsListTests,
} from '@/api/generated/sdk.gen';
import { apiCall } from '@/api/utils';
import { getAccessToken, getCurrentUser, loadStoredAuth, onAuthChange } from '@/lib/auth-storage';

export type { UserOut as ApiUser } from '@/api/generated/types.gen';
export type ApiListResponse<T> = {
  data: T[] | null;
  error: Error | null;
};

export {
  getAccessToken,
  getCurrentUser,
  loadStoredAuth,
  onAuthChange,
  clearAuth,
  persistAuth,
} from '@/lib/auth-storage';

export { API_BASE_URL };

export type FetchOptions = {
  parentId?: string | null;
  all?: boolean;
  id?: string;
  articleId?: string;
  testId?: string;
  rescueId?: string;
};

async function asListResponse<T>(fn: () => Promise<T[]>): Promise<ApiListResponse<T>> {
  try {
    const data = await fn();
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function apiFetchRelation<T = unknown>(
  relation: string,
  options: FetchOptions = {},
): Promise<ApiListResponse<T>> {
  const parentQuery =
    options.all
      ? { all: true }
      : options.parentId != null && options.parentId.length > 0
        ? { parentId: options.parentId }
        : options.parentId === null || options.parentId === undefined
          ? {}
          : {};

  switch (relation) {
    case 'folders':
      if (options.id) {
        return asListResponse(async () => [
          (await apiCall(() => foldersGetFolder({ path: { item_id: options.id! } }))) as T,
        ]);
      }
      return asListResponse(async () =>
        (await apiCall(() =>
          foldersListFolders({ query: { ...parentQuery, all: options.all || undefined } }),
        )) as T[],
      );
    case 'articles':
      if (options.id) {
        return asListResponse(async () => [
          (await apiCall(() => articlesGetArticle({ path: { item_id: options.id! } }))) as T,
        ]);
      }
      return asListResponse(async () =>
        (await apiCall(() =>
          articlesListArticles({ query: { ...parentQuery, all: options.all || undefined } }),
        )) as T[],
      );
    case 'tests':
      if (options.id) {
        return asListResponse(async () => [
          (await apiCall(() => testsGetTest({ path: { item_id: options.id! } }))) as T,
        ]);
      }
      return asListResponse(async () =>
        (await apiCall(() =>
          testsListTests({ query: { ...parentQuery, all: options.all || undefined } }),
        )) as T[],
      );
    case 'rescue':
      if (options.id) {
        return asListResponse(async () => [
          (await apiCall(() => rescueGetRescue({ path: { item_id: options.id! } }))) as T,
        ]);
      }
      return asListResponse(async () =>
        (await apiCall(() =>
          rescueListRescue({ query: { ...parentQuery, all: options.all || undefined } }),
        )) as T[],
      );
    case 'articles_stats':
      return asListResponse(async () =>
        (await apiCall(() =>
          statsListArticleStats({
            query: options.articleId ? { articleId: options.articleId } : {},
          }),
        )) as T[],
      );
    case 'tests_stats':
      return asListResponse(async () =>
        (await apiCall(() =>
          statsListTestStats({
            query: options.testId ? { testId: options.testId } : {},
          }),
        )) as T[],
      );
    case 'rescue_stats':
      return asListResponse(async () =>
        (await apiCall(() =>
          statsListRescueStats({
            query: options.rescueId ? { rescueId: options.rescueId } : {},
          }),
        )) as T[],
      );
    case 'test_results':
      return asListResponse(async () =>
        (await apiCall(() =>
          statsListTestResults({
            query: options.testId ? { testId: options.testId } : {},
          }),
        )) as T[],
      );
    default:
      return { data: null, error: new Error(`Unknown relation: ${relation}`) };
  }
}

/** Generic JSON request for endpoints not yet wrapped (stats upserts, etc.) */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await authFetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
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
  const res = await authFetch(`${API_BASE_URL}/api/v1/media/${path}`);
  if (!res.ok) throw new Error(`File not found: ${fileName}`);
  return res.blob();
}
