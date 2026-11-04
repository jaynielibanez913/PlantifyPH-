import { NextRequest, NextResponse } from 'next/server';
import {
  deleteWateringSchedule,
  updateWateringSchedule,
} from '@/features/watering/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { wateringScheduleUpdateSchema } from '@/lib/validation/schemas';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = wateringScheduleUpdateSchema.parse(body);

    const schedule = updateWateringSchedule(user, id, parsed);
    return NextResponse.json({ schedule }, { status: 200 });
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
    deleteWateringSchedule(user, id);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
