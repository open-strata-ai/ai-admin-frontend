import { getSessionRef } from './sessionStore';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`HTTP ${status}: ${detail}`);
    this.name = 'ApiError';
  }
}

function mergeHeaders(init: RequestInit | undefined): Record<string, string> {
  const { accessToken, tenantId } = getSessionRef();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'X-Tenant-Id': tenantId,
    'X-Admin-Scope': tenantId,
    'Content-Type': 'application/json',
  };
  const extra = init?.headers;
  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((v, k) => {
        headers[k] = v;
      });
    } else if (Array.isArray(extra)) {
      extra.forEach(([k, v]) => {
        headers[k] = v;
      });
    } else {
      Object.assign(headers, extra);
    }
  }
  return headers;
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: mergeHeaders(init),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new ApiError(res.status, detail);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }
}

const baseUrl = import.meta.env.VITE_ADMIN_API_BASE ?? 'http://localhost:8081';
export const apiClient = new ApiClient(baseUrl);
