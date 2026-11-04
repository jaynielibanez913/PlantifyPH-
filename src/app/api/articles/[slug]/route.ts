import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug } from '@/features/articles/service';
import { handleRouteError } from '@/lib/errors/app-error';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const article = getArticleBySlug(slug);
    return NextResponse.json({ article }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
