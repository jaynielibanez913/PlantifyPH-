import { NextRequest, NextResponse } from 'next/server';
import { changeUserPassword } from '@/features/users/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { changePasswordSchema } from '@/lib/validation/schemas';

export async function PATCH(request: NextRequest) {
  try {
    const current = await requireAuthenticatedUser();
    const body = await request.json();
    const parsed = changePasswordSchema.parse(body);

    changeUserPassword(current.id, parsed.currentPassword, parsed.newPassword);
    return NextResponse.json({ updated: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
