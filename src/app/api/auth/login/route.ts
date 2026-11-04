import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/features/auth/service';
import { attachSessionCookie, createServerSession } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { loginSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'local';
    enforceRateLimit(`login:${ip}`, 25, 60_000);

    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const user = authenticateUser(parsed);
    const session = createServerSession(user.id);

    const response = NextResponse.json(
      { user, sessionToken: session.id },
      { status: 200 }
    );
    attachSessionCookie(response, session, request);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
