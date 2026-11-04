import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/features/auth/service';
import { attachSessionCookie, createServerSession } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { registerSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'local';
    enforceRateLimit(`register:${ip}`, 20, 60_000);

    const body = await request.json();
    const parsed = registerSchema.parse(body);

    const user = registerUser(parsed);
    const session = createServerSession(user.id);

    const response = NextResponse.json(
      { user, sessionToken: session.id },
      { status: 201 }
    );
    attachSessionCookie(response, session, request);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
