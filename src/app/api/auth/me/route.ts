import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
