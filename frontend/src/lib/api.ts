import type { FieldErrors } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: FieldErrors = {},
  ) {
    super(message);
  }
}

/** Fired when an admin request comes back 401 so the dashboard can send the user to the login page. */
export const AUTH_EXPIRED_EVENT = 'astute:auth-expired';

const readCookie = (name: string) =>
  document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);

// Spring Security keeps the CSRF token in the XSRF-TOKEN cookie; it must be echoed in a header.
async function csrfToken(refresh = false): Promise<string> {
  if (refresh || !readCookie('XSRF-TOKEN')) {
    await fetch('/api/csrf', { credentials: 'same-origin' });
  }
  return decodeURIComponent(readCookie('XSRF-TOKEN') ?? '');
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function api<T = void>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const send = async (refreshToken: boolean) => {
    const headers: Record<string, string> = {};
    if (method !== 'GET') headers['X-XSRF-TOKEN'] = await csrfToken(refreshToken);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let res = await send(false);
  if (res.status === 403 && method !== 'GET') res = await send(true); // stale CSRF token - retry once

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/api/admin/') && path !== '/api/admin/login') {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    const err = (data ?? {}) as { error?: string; errors?: FieldErrors };
    throw new ApiError(err.error || 'Something went wrong. Please try again.', res.status, err.errors ?? {});
  }
  return data as T;
}
