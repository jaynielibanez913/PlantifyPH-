import { NextRequest, NextResponse } from 'next/server';
import {
  clearSessionCookie,
  resolveRequestToken,
  revokeServerSession,
} from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';

export async function POST(request: NextRequest) {
  try {
    const token = await resolveRequestToken();
    if (token) {
      revokeServerSession(token);
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    clearSessionCookie(response, request);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
