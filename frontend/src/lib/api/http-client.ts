import { apiClientConfig } from './config';

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export class NetworkError extends ApiError {
  public constructor(message = 'Unable to reach the server. Check your connection and try again.') {
    super(message, 0);
    this.name = 'NetworkError';
  }
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    // fetch() throws on network failure (offline, DNS, CORS, timeout before response)
    const message = err instanceof Error ? err.message : '';
    throw new NetworkError(
      message === 'Failed to fetch' || message.includes('NetworkError')
        ? 'Unable to reach the server. Check your connection and try again.'
        : `Network request failed: ${message}`,
    );
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = safeFetch(`${apiClientConfig.baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
    .then(async (r) => {
      if (!r.ok) return null;
      if (r.status === 204) return null; // No session to refresh
      const data = (await r.json()) as { accessToken?: string };
      return data.accessToken ?? null;
    })
    .catch(() => null)
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

async function requestJson<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const authToken = readStoredAuthToken();

  const response = await safeFetch(`${apiClientConfig.baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
    const newToken = await attemptTokenRefresh();

    if (newToken) {
      try {
        window.localStorage.setItem(apiClientConfig.authTokenStorageKey, newToken);
      } catch {
        // ignore
      }

      // Retry with new token
      const retryResponse = await safeFetch(`${apiClientConfig.baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers ?? {}),
        },
      });

      if (!retryResponse.ok) {
        throw new ApiError(`Request failed for ${path}`, retryResponse.status);
      }

      return (await retryResponse.json()) as TResponse;
    } else {
      // Refresh failed — session expired
      window.dispatchEvent(new Event('auth:session-expired'));
      throw new ApiError('Session expired.', 401);
    }
  }

  if (!response.ok) {
    let message = `Request failed for ${path}`;

    try {
      const payload = (await response.json()) as { message?: string | string[] };

      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        message = payload.message;
      }
    } catch {
      // Keep the fallback request message when no JSON error payload exists.
    }

    throw new ApiError(message, response.status);
  }

  // 204 No Content and empty 200 responses have no body to parse.
  if (response.status === 204) return undefined as unknown as TResponse;
  const text = await response.text();
  if (text.length === 0) return null as unknown as TResponse;
  return JSON.parse(text) as TResponse;
}

export async function httpGet<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  return requestJson<TResponse>(path, init);
}

export async function httpPost<TResponse, TRequest>(
  path: string,
  body: TRequest,
  init?: RequestInit,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...init,
    body: JSON.stringify(body),
    method: 'POST',
  });
}

export async function httpPatch<TResponse, TRequest>(
  path: string,
  body: TRequest,
  init?: RequestInit,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...init,
    body: JSON.stringify(body),
    method: 'PATCH',
  });
}

export async function httpPut<TResponse, TRequest>(
  path: string,
  body: TRequest,
  init?: RequestInit,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...init,
    body: JSON.stringify(body),
    method: 'PUT',
  });
}

export async function httpDelete<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...init,
    method: 'DELETE',
  });
}

function readStoredAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const token =
      window.localStorage.getItem(apiClientConfig.authTokenStorageKey) ??
      window.sessionStorage.getItem(apiClientConfig.authTokenStorageKey);

    return token && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}
