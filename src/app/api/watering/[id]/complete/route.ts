import { NextRequest, NextResponse } from 'next/server';
import { completeWateringSchedule } from '@/features/watering/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { wateringCompleteSchema } from '@/lib/validation/schemas';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = wateringCompleteSchema.parse(body);

    const schedule = completeWateringSchedule(user, id, parsed.notes);
    return NextResponse.json({ schedule }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
