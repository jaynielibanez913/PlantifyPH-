import { NextRequest, NextResponse } from 'next/server';
import { deletePlantHealthRecord } from '@/features/plant-health/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    deletePlantHealthRecord(user, id);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
