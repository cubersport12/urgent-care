export {
  apiFetchRelation,
  type FetchOptions,
} from '@/lib/api';
export type { ApiListResponse } from '@/lib/api';

/** @deprecated use apiFetchRelation */
export { apiFetchRelation as useSupabaseFetch } from '@/lib/api';
