import { NextRequest, NextResponse } from 'next/server';
import {
  listAllUsersForAdmin,
  updateUserByAdmin,
} from '@/features/admin/service';
import { requireAdminUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { adminUserUpdateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    await requireAdminUser();
    const users = listAllUsersForAdmin();
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();
    const parsed = adminUserUpdateSchema.parse(body);

    const updated = updateUserByAdmin(admin, parsed);
    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
