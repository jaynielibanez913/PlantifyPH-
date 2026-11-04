import { NextRequest, NextResponse } from 'next/server';
import {
  deleteUserPlant,
  getUserPlantDetail,
  updateUserPlant,
} from '@/features/my-plants/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { userPlantUpdateSchema } from '@/lib/validation/schemas';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const item = getUserPlantDetail(user.id, id);
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = userPlantUpdateSchema.parse(body);

    const item = updateUserPlant(user, id, parsed);
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    deleteUserPlant(user, id);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
