import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '@/lib/errors/app-error';
import { getStore, persistStore, recordActivity } from '@/lib/store/memory-db';
import type { Article, ArticleCategory, ArticleStatus, SafeUser } from '@/types/domain';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function listArticleCategories(): ArticleCategory[] {
  const store = getStore();
  return Array.from(store.articleCategories.values());
}

export function listPublishedArticles(filters?: {
  search?: string;
  categoryId?: string;
}): Article[] {
  const store = getStore();
  const q = filters?.search?.trim().toLowerCase() ?? '';
  const categoryId = filters?.categoryId?.trim() ?? '';

  const items: Article[] = [];
  for (const article of store.articles.values()) {
    if (article.status !== 'PUBLISHED') {
      continue;
    }
    if (categoryId && categoryId !== 'all' && article.categoryId !== categoryId) {
      continue;
    }
    if (q) {
      const hay = `${article.title} ${article.excerpt} ${article.content} ${article.seasonTag}`.toLowerCase();
      if (!hay.includes(q)) {
        continue;
      }
    }
    items.push(article);
  }

  items.sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.createdAt).getTime()
  );
  return items;
}

export function getArticleBySlug(slug: string): Article {
  const store = getStore();
  for (const article of store.articles.values()) {
    if (article.slug === slug && article.status === 'PUBLISHED') {
      return article;
    }
  }
  throw new NotFoundError('Gardening guide not found.');
}

export function createArticle(
  author: SafeUser,
  input: {
    title: string;
    categoryId: string;
    excerpt: string;
    content: string;
    imageUrl: string;
    seasonTag: string;
    status: ArticleStatus;
  }
): Article {
  const store = getStore();
  const category = store.articleCategories.get(input.categoryId);
  if (!category) {
    throw new NotFoundError('Article category not found.');
  }

  const slug = slugify(input.title);
  for (const existing of store.articles.values()) {
    if (existing.slug === slug) {
      throw new ConflictError('An article with a similar title already exists.');
    }
  }

  const now = new Date().toISOString();
  const wordCount = input.content.trim().split(/\s+/).length;
  const readTimeMinutes = Math.max(2, Math.round(wordCount / 180));

  const article: Article = {
    id: `art_${randomUUID().slice(0, 8)}`,
    authorId: author.id,
    authorName: author.name,
    categoryId: category.id,
    categoryName: category.name,
    title: input.title,
    slug,
    excerpt: input.excerpt,
    content: input.content,
    imageUrl: input.imageUrl,
    readTimeMinutes,
    seasonTag: input.seasonTag,
    status: input.status,
    publishedAt: input.status === 'PUBLISHED' ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  store.articles.set(article.id, article);
  recordActivity(author.id, author.name, 'Published gardening guide', article.title);
  persistStore(store);
  return article;
}
