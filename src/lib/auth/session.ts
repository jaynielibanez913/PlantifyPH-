import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AuthenticationError, AuthorizationError } from '@/lib/errors/app-error';
import { getStore, persistStore } from '@/lib/store/memory-db';
import type { SafeUser, Session, User, UserRole } from '@/types/domain';

export const SESSION_COOKIE_NAME = 'plantifyph_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface SignedSessionPayload {
  sid: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  location: string;
  exp: number;
}

const revokedTokens = new Set<string>();

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  return 'plantifyph-serverless-hmac-fallback-secret-2026';
}

function signSessionPayload(payload: SignedSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString(
    'base64url'
  );
  const sig = createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySignedToken(token: string): SignedSessionPayload | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) {
    return null;
  }

  const encoded = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);
  const expectedSig = createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const a = Buffer.from(providedSig, 'utf-8');
  const b = Buffer.from(expectedSig, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as SignedSessionPayload;
    if (!parsed.uid || !parsed.exp || parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _removed, ...safe } = user;
  void _removed;
  return safe;
}

export function createServerSession(userId: string): Session {
  const store = getStore();
  const user = store.users.get(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const token = signSessionPayload({
    sid: randomBytes(16).toString('hex'),
    uid: userId,
    email: user?.email ?? '',
    name: user?.name ?? 'PlantifyPH Gardener',
    role: user?.role ?? 'USER',
    location: user?.location ?? 'Metro Manila, Philippines',
    exp: expiresAt.getTime(),
  });

  const session: Session = {
    id: token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  store.sessions.set(token, session);
  persistStore(store);
  return session;
}

export function revokeServerSession(sessionId: string): void {
  revokedTokens.add(sessionId);
  const store = getStore();
  if (store.sessions.delete(sessionId)) {
    persistStore(store);
  }
}

function getCookieSecurityPolicy(request?: NextRequest): {
  https: boolean;
  crossSiteIframe: boolean;
} {
  let https =
    process.env.APP_URL?.startsWith('https://') ||
    process.env.NODE_ENV === 'production';
  let crossSiteIframe = false;

  if (request) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto && proto.includes('https')) https = true;
    const host = request.headers.get('host') ?? '';
    if (host.endsWith('.run.app')) {
      https = true;
      crossSiteIframe = true;
    }
    if (request.nextUrl?.protocol === 'https:') https = true;

    const fetchDest = request.headers.get('sec-fetch-dest');
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchDest === 'iframe' || fetchSite === 'cross-site') {
      crossSiteIframe = true;
    }
  }

  return { https, crossSiteIframe: https && crossSiteIframe };
}

export function attachSessionCookie(
  response: NextResponse,
  session: Session,
  request?: NextRequest
): void {
  const { https, crossSiteIframe } = getCookieSecurityPolicy(request);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.id,
    httpOnly: true,
    sameSite: crossSiteIframe ? 'none' : 'lax',
    secure: https,
    ...(crossSiteIframe ? { partitioned: true } : {}),
    path: '/',
    expires: new Date(session.expiresAt),
  });
}

export function clearSessionCookie(
  response: NextResponse,
  request?: NextRequest
): void {
  const { https, crossSiteIframe } = getCookieSecurityPolicy(request);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: crossSiteIframe ? 'none' : 'lax',
    secure: https,
    ...(crossSiteIframe ? { partitioned: true } : {}),
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
  if (!token || revokedTokens.has(token)) {
    return null;
  }

  const store = getStore();
  const existingSession = store.sessions.get(token);

  if (existingSession) {
    if (new Date(existingSession.expiresAt).getTime() <= Date.now()) {
      store.sessions.delete(token);
      persistStore(store);
      return null;
    }
    const localUser = store.users.get(existingSession.userId);
    if (!localUser || !localUser.active) {
      store.sessions.delete(token);
      persistStore(store);
      return null;
    }
    return toSafeUser(localUser);
  }

  // Stateless HMAC verification for serverless multi-instance deployments (e.g., Vercel)
  const verified = verifySignedToken(token);
  if (!verified) {
    return null;
  }

  const knownUser = store.users.get(verified.uid);
  if (knownUser) {
    if (!knownUser.active) {
      return null;
    }
    return toSafeUser(knownUser);
  }

  // Rehydrate newly registered user onto cold serverless container if needed
  const nowIso = new Date().toISOString();
  const hydratedUser: User = {
    id: verified.uid,
    name: verified.name,
    email: verified.email,
    passwordHash: '',
    role: verified.role,
    location: verified.location,
    bio: '',
    avatarUrl: null,
    notifyWatering: true,
    notifyReminders: true,
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.users.set(hydratedUser.id, hydratedUser);
  return toSafeUser(hydratedUser);
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
