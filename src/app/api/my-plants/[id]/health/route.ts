import { NextRequest, NextResponse } from 'next/server';
import {
  createPlantHealthRecord,
  listPlantHealthRecords,
} from '@/features/plant-health/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { healthRecordCreateSchema } from '@/lib/validation/schemas';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const records = listPlantHealthRecords(user.id, id);
    return NextResponse.json({ records }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = healthRecordCreateSchema.parse(body);

    const record = createPlantHealthRecord(user, id, parsed);
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
