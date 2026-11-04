import { NextRequest, NextResponse } from 'next/server';
import {
  listArticleCategories,
  listPublishedArticles,
} from '@/features/articles/service';
import { handleRouteError } from '@/lib/errors/app-error';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const categoryId = searchParams.get('categoryId') ?? undefined;

    const articles = listPublishedArticles({ search, categoryId });
    const categories = listArticleCategories();
    return NextResponse.json({ articles, categories }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
