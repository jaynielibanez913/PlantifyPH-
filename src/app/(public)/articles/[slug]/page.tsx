import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import { getCurrentUser } from '@/lib/auth/session';
import { getArticleBySlug } from '@/features/articles/service';
import { formatManilaDate } from '@/lib/utils/format';

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  const { slug } = await params;

  let article;
  try {
    article = getArticleBySlug(slug);
  } catch {
    notFound();
  }

  const paragraphs = article.content.split('\n\n').filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F7]">
      <PublicHeader user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        <Link
          href="/articles"
          className="inline-block text-xs font-semibold text-[#1B4D3E] hover:underline underline-offset-4 mb-6"
        >
          ← Back to Care Guides
        </Link>

        <article className="bg-white border border-[#DCE4DD] rounded-2xl overflow-hidden">
          <div className="aspect-[16/9] w-full bg-[#E8EFE9]">
            <BotanicalImage
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <div>
              <p className="text-xs text-[#5E7065] mb-3">
                <span>{article.categoryName}</span>
                <span aria-hidden="true"> · </span>
                <span>{article.seasonTag}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono-num">{article.readTimeMinutes} min read</span>
                <span aria-hidden="true"> · </span>
                <span>{formatManilaDate(article.publishedAt)}</span>
              </p>
              <h1
                className="font-display text-3xl sm:text-4xl font-bold text-[#13241B] leading-tight"
                style={{ textWrap: 'balance' }}
              >
                {article.title}
              </h1>
              <p className="text-xs text-[#5E7065] mt-3">
                Written by {article.authorName}
              </p>
            </div>

            <p className="text-base font-medium text-[#2E4237] leading-relaxed border-y border-[#E6ECE7] py-4">
              {article.excerpt}
            </p>

            <div className="space-y-4 text-base text-[#37493E] leading-[1.75]">
              {paragraphs.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
