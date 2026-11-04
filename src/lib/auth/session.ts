import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AuthenticationError, AuthorizationError } from '@/lib/errors/app-error';
import { getStore, persistStore } from '@/lib/store/memory-db';
import type { SafeUser, Session, User } from '@/types/domain';

export const SESSION_COOKIE_NAME = 'plantifyph_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _removed, ...safe } = user;
  void _removed;
  return safe;
}

export function createServerSession(userId: string): Session {
  const store = getStore();
  const id = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const session: Session = {
    id,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  store.sessions.set(id, session);
  persistStore(store);
  return session;
}

export function revokeServerSession(sessionId: string): void {
  const store = getStore();
  store.sessions.delete(sessionId);
  persistStore(store);
}

function isHttpsContext(request?: NextRequest): boolean {
  if (request) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto && proto.includes('https')) return true;
    const host = request.headers.get('host') ?? '';
    if (host.endsWith('.run.app')) return true;
    if (request.nextUrl?.protocol === 'https:') return true;
  }
  if (process.env.APP_URL?.startsWith('https://')) return true;
  return process.env.NODE_ENV === 'production';
}

export function attachSessionCookie(
  response: NextResponse,
  session: Session,
  request?: NextRequest
): void {
  const https = isHttpsContext(request);

  // In AI Studio's cross-origin HTTPS preview iframe, SameSite=None + Secure + Partitioned
  // is required so the browser accepts and sends the session cookie.
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.id,
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    partitioned: https,
    path: '/',
    expires: new Date(session.expiresAt),
  });
}

export function clearSessionCookie(
  response: NextResponse,
  request?: NextRequest
): void {
  const https = isHttpsContext(request);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    partitioned: https,
    path: '/',
    maxAge: 0,
  });
}

export async function resolveRequestToken(): Promise<string | null> {
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      return bearer;
    }
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return cookieToken ?? null;
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = await resolveRequestToken();
  if (!token) {
    return null;
  }

  const store = getStore();
  const session = store.sessions.get(token);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    store.sessions.delete(token);
    persistStore(store);
    return null;
  }

  const user = store.users.get(session.userId);
  if (!user || !user.active) {
    store.sessions.delete(token);
    persistStore(store);
    return null;
  }

  return toSafeUser(user);
}

export async function requireAuthenticatedUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
}

export async function requireAdminUser(): Promise<SafeUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError('Administrator access is required for this resource.');
  }
  return user;
}
