/** Helpers for @hey-api/openapi-ts responses. */

export class ApiError extends Error {
  detail: string;
  status_code?: number;

  constructor(detail: string, status_code?: number) {
    super(detail);
    this.name = 'ApiError';
    this.detail = detail;
    this.status_code = status_code;
  }
}

export function formatApiErrorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg);
        }
        return JSON.stringify(item);
      })
      .join('; ');
  }
  if (detail && typeof detail === 'object') {
    const obj = detail as { detail?: unknown; message?: unknown };
    if (obj.detail !== undefined) return formatApiErrorDetail(obj.detail, fallback);
    if (typeof obj.message === 'string') return obj.message;
    return JSON.stringify(detail);
  }
  return fallback;
}

type ApiResult<T> = {
  data?: T;
  error?: unknown;
  response?: Response;
};

export function toApiError(error: unknown, status?: number): ApiError {
  if (error instanceof ApiError) return error;
  if (error && typeof error === 'object' && 'detail' in error) {
    const detail = formatApiErrorDetail(
      (error as { detail: unknown }).detail,
      `HTTP ${status ?? 'error'}`,
    );
    return new ApiError(detail, status);
  }
  if (error instanceof Error && error.message) {
    return new ApiError(error.message, status);
  }
  return new ApiError(`HTTP ${status ?? 'error'}`, status);
}

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (result.error) {
    throw toApiError(result.error, result.response?.status);
  }
  return result.data as T;
}

export async function apiCall<T>(fn: () => Promise<ApiResult<T>>): Promise<T> {
  return unwrapApiResult(await fn());
}
