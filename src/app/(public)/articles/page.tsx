import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { getCurrentUser } from '@/lib/auth/session';
import {
  listArticleCategories,
  listPublishedArticles,
} from '@/features/articles/service';
import { ArticlesExplorer } from '@/features/articles/ArticlesExplorer';

export default async function ArticlesPage() {
  const user = await getCurrentUser();
  const articles = listPublishedArticles();
  const categories = listArticleCategories();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F7]">
      <PublicHeader user={user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        <div className="max-w-2xl mb-8">
          <p className="text-xs font-medium text-[#3B5E4C] mb-1">
            Gardening Knowledge Base
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#13241B] mb-2">
            Care Guides & Seasonal Advice
          </h1>
          <p className="text-sm sm:text-base text-[#4D5F54]">
            Practical tutorials written for Philippine weather patterns, local potting media, balcony edibles, and gentle pest prevention.
          </p>
        </div>

        <ArticlesExplorer articles={articles} categories={categories} />
      </main>
      <PublicFooter />
    </div>
  );
}
