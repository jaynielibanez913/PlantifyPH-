import { NextRequest, NextResponse } from 'next/server';
import { listAllArticlesForAdmin } from '@/features/admin/service';
import { createArticle, listArticleCategories } from '@/features/articles/service';
import { requireAdminUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { articleCreateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    await requireAdminUser();
    const articles = listAllArticlesForAdmin();
    const categories = listArticleCategories();
    return NextResponse.json({ articles, categories }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();
    const parsed = articleCreateSchema.parse(body);

    const article = createArticle(admin, parsed);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
