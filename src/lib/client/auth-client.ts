'use client';

const TOKEN_STORAGE_KEY = 'plantifyph_session_token';

export function setClientSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getClientSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ??
      window.localStorage.getItem(TOKEN_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function clearClientSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  const token = getClientSessionToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
}
