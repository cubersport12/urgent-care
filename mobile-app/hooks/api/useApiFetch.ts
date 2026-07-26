import { apiGetList, type ApiListResponse } from '@/lib/api';

/** Content resource → REST path */
const RELATION_PATH: Record<string, string> = {
  folders: '/api/v1/folders',
  articles: '/api/v1/articles',
  tests: '/api/v1/tests',
  rescue: '/api/v1/rescue',
  articles_stats: '/api/v1/articles-stats',
  tests_stats: '/api/v1/tests-stats',
  rescue_stats: '/api/v1/rescue-stats',
  test_results: '/api/v1/test-results',
};

export type FetchOptions = {
  parentId?: string | null;
  all?: boolean;
  id?: string;
  articleId?: string;
  testId?: string;
  rescueId?: string;
};

export async function apiFetchRelation<T = unknown>(
  relation: string,
  options: FetchOptions = {},
): Promise<ApiListResponse<T>> {
  const base = RELATION_PATH[relation];
  if (!base) {
    return { data: null, error: new Error(`Unknown relation: ${relation}`) };
  }

  if (options.id) {
    try {
      const { apiFetch } = await import('@/lib/api');
      const item = await apiFetch<T>(`${base}/${options.id}`);
      return { data: item ? [item] : [], error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  const params = new URLSearchParams();
  if (options.all) {
    params.set('all', 'true');
  } else if (options.parentId !== undefined) {
    if (options.parentId != null && options.parentId.length > 0) {
      params.set('parentId', options.parentId);
    }
    // omit parentId → roots (null)
  }
  if (options.articleId) params.set('articleId', options.articleId);
  if (options.testId) params.set('testId', options.testId);
  if (options.rescueId) params.set('rescueId', options.rescueId);

  const qs = params.toString();
  return apiGetList<T>(qs ? `${base}?${qs}` : base);
}

/** @deprecated use apiFetchRelation */
export const useSupabaseFetch = async <T = unknown>(
  relation: string,
  filterCallback?: (query: FakeQuery) => FakeQuery,
): Promise<ApiListResponse<T>> => {
  const q = new FakeQuery();
  filterCallback?.(q);
  return apiFetchRelation<T>(relation, q.toOptions());
};

class FakeQuery {
  private opts: FetchOptions = {};

  filter(col: string, op: string, value?: string): this {
    if (col === 'parentId') {
      if (op === 'is') this.opts.parentId = null;
      else this.opts.parentId = value ?? null;
    }
    if (col === 'id' && op === 'eq') this.opts.id = value;
    return this;
  }

  eq(col: string, value: string): this {
    if (col === 'clientId') return this;
    if (col === 'articleId') this.opts.articleId = value;
    if (col === 'testId') this.opts.testId = value;
    if (col === 'rescueId') this.opts.rescueId = value;
    return this;
  }

  in(col: string, _ids: string[]): this {
    // Stats filtered client-side after fetch-all for user
    if (col === 'articleId' || col === 'testId' || col === 'rescueId') {
      // no server filter for multi-id; fetch all for client
    }
    return this;
  }

  toOptions(): FetchOptions {
    return this.opts;
  }
}
