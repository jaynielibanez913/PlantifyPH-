import { NextRequest, NextResponse } from 'next/server';
import {
  createWateringSchedule,
  listWateringSchedules,
} from '@/features/watering/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { wateringScheduleCreateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const schedules = listWateringSchedules(user.id);
    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json();
    const parsed = wateringScheduleCreateSchema.parse(body);

    const schedule = createWateringSchedule(user, parsed);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
