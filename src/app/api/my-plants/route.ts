import { NextRequest, NextResponse } from 'next/server';
import { addUserPlant, listUserPlants } from '@/features/my-plants/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { userPlantCreateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const items = listUserPlants(user.id);
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json();
    const parsed = userPlantCreateSchema.parse(body);

    const item = addUserPlant(user, parsed);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
