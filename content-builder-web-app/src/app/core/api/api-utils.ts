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

type ApiResult<T> = {
  data?: T;
  error?: unknown;
  response?: Response;
};

function formatDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && 'detail' in detail) {
    return formatDetail((detail as { detail: unknown }).detail, fallback);
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: unknown }).message);
  }
  return fallback;
}

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (result.error) {
    const status = result.response?.status;
    const detail =
      result.error && typeof result.error === 'object' && 'detail' in result.error
        ? formatDetail((result.error as { detail: unknown }).detail, `HTTP ${status ?? 'error'}`)
        : result.error instanceof Error
          ? result.error.message
          : `HTTP ${status ?? 'error'}`;
    throw new ApiError(detail, status);
  }
  return result.data as T;
}

export async function apiCall<T>(fn: () => Promise<ApiResult<T>>): Promise<T> {
  return unwrapApiResult(await fn());
}
