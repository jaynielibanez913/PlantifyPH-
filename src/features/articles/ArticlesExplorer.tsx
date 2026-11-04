'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import { formatManilaDate } from '@/lib/utils/format';
import type { Article, ArticleCategory } from '@/types/domain';

interface ArticlesExplorerProps {
  articles: Article[];
  categories: ArticleCategory[];
}

export function ArticlesExplorer({ articles, categories }: ArticlesExplorerProps) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((art) => {
      if (categoryId !== 'all' && art.categoryId !== categoryId) {
        return false;
      }
      if (q) {
        const hay = `${art.title} ${art.excerpt} ${art.content} ${art.seasonTag}`.toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [articles, search, categoryId]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#DCE4DD] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-[#5E7065] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides (e.g. Habagat, pumice, Calamansi, neem)..."
            aria-label="Search gardening articles"
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
          />
        </div>

        <div
          role="group"
          aria-label="Article categories"
          className="flex items-center gap-1.5 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setCategoryId('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              categoryId === 'all'
                ? 'bg-[#1B4D3E] text-white'
                : 'bg-[#F2F5F2] text-[#4D5F54] hover:text-[#13241B]'
            }`}
          >
            All Topics
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryId === cat.id
                  ? 'bg-[#1B4D3E] text-white'
                  : 'bg-[#F2F5F2] text-[#4D5F54] hover:text-[#13241B]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#DCE4DD] rounded-xl p-12 text-center space-y-3">
          <p className="font-display text-lg font-bold text-[#13241B]">
            No articles match your filter
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategoryId('all');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg cursor-pointer"
          >
            Reset Topic Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="group flex flex-col bg-white border border-[#DCE4DD] rounded-xl overflow-hidden hover:border-[#1B4D3E] transition-colors"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-[#E8EFE9]">
                <BotanicalImage
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <p className="text-xs text-[#5E7065] mb-2">
                    <span>{article.categoryName}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{article.seasonTag}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono-num">{article.readTimeMinutes} min read</span>
                  </p>
                  <h2 className="font-display text-xl font-bold text-[#13241B] group-hover:text-[#1B4D3E] transition-colors mb-2">
                    {article.title}
                  </h2>
                  <p className="text-sm text-[#4D5F54] leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#EBF0EC] flex items-center justify-between text-xs text-[#5E7065]">
                  <span>
                    By {article.authorName} · {formatManilaDate(article.publishedAt)}
                  </span>
                  <span className="font-semibold text-[#1B4D3E]">Read Guide →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
