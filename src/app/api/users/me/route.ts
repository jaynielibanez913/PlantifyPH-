import { NextRequest, NextResponse } from 'next/server';
import {
  deactivateUserAccount,
  getUserProfile,
  updateUserProfile,
} from '@/features/users/service';
import { clearSessionCookie, requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { updateProfileSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const current = await requireAuthenticatedUser();
    const profile = getUserProfile(current.id);
    return NextResponse.json({ user: profile }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const current = await requireAuthenticatedUser();
    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);
    const updated = updateUserProfile(current.id, parsed);
    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const current = await requireAuthenticatedUser();
    deactivateUserAccount(current.id);
    const response = NextResponse.json({ deactivated: true }, { status: 200 });
    clearSessionCookie(response, request);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
