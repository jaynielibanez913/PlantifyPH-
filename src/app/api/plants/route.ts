import { NextRequest, NextResponse } from 'next/server';
import {
  createPlant,
  listPlantCategories,
  listPlants,
} from '@/features/plants/service';
import { requireAdminUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { plantCreateSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const categoryId = searchParams.get('categoryId') ?? undefined;
    const difficulty = searchParams.get('difficulty') ?? undefined;
    const petSafeOnly = searchParams.get('petSafe') === 'true';
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '24');

    const catalog = listPlants({
      search,
      categoryId,
      difficulty,
      petSafeOnly,
      page,
      limit,
    });
    const categories = listPlantCategories();

    return NextResponse.json({ ...catalog, categories }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();
    const parsed = plantCreateSchema.parse(body);

    const plant = createPlant(admin, parsed);
    return NextResponse.json({ plant }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
