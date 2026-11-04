import { NextRequest, NextResponse } from 'next/server';
import {
  deletePlant,
  getPlantById,
  updatePlant,
} from '@/features/plants/service';
import { requireAdminUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { plantUpdateSchema } from '@/lib/validation/schemas';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const plant = getPlantById(id);
    return NextResponse.json({ plant }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = plantUpdateSchema.parse(body);

    const plant = updatePlant(admin, id, parsed);
    return NextResponse.json({ plant }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    deletePlant(admin, id);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
