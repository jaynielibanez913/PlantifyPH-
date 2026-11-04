import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import { getCurrentUser } from '@/lib/auth/session';
import { listPlants } from '@/features/plants/service';
import { listPublishedArticles } from '@/features/articles/service';
import { formatManilaDate } from '@/lib/utils/format';

export default async function HomePage() {
  const user = await getCurrentUser();
  const featuredCatalog = listPlants({ limit: 4 });
  const articles = listPublishedArticles().slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F7]">
      <PublicHeader user={user} />

      <main className="flex-1">
        {/* Hero Split Section */}
        <section className="max-w-7xl mx-auto px-6 pt-10 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center py-4 lg:py-8">
              <p className="text-xs font-medium text-[#3B5E4C] mb-4">
                Philippine Plant Care & Personal Garden Platform
              </p>
              <h1
                className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#13241B] leading-[1.08] mb-6"
                style={{ textWrap: 'balance' }}
              >
                Grow healthier tropical plants across every Philippine season.
              </h1>
              <p className="text-base text-[#4D5F54] leading-relaxed max-w-xl mb-8">
                Discover endemic aroids, lanai ferns, and balcony citrus, organize your personal collection, automate watering schedules, and log plant health from Tag-init heat through Habagat rains.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={user ? '/dashboard' : '/register'}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{user ? 'Go to My Garden' : 'Start Your Collection'}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/plants"
                  className="inline-flex items-center px-5 py-3 text-sm font-semibold text-[#13241B] bg-white border border-[#DCE4DD] rounded-lg hover:bg-[#EFF4F0] transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Plant Catalog
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 min-h-[320px] lg:min-h-[460px]">
              <div className="h-full w-full overflow-hidden rounded-2xl border border-[#DCE4DD] bg-white">
                <BotanicalImage
                  src="/images/hero-atelier.jpg"
                  alt="Sunlit Philippine tropical botanical studio with Monstera and Alocasia in stoneware planters"
                  className="w-full h-full lg:h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Full-width KPI Proof Strip below Hero Split */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 py-6 px-6 bg-white border border-[#DCE4DD] rounded-xl">
            <div>
              <p className="font-mono-num text-2xl sm:text-3xl font-semibold text-[#13241B]">
                9 Categories
              </p>
              <p className="text-xs text-[#4D5F54] mt-1">
                Indoor, tropical, citrus, herbs & arid flora
              </p>
            </div>
            <div>
              <p className="font-mono-num text-2xl sm:text-3xl font-semibold text-[#13241B]">
                18°C – 36°C
              </p>
              <p className="text-xs text-[#4D5F54] mt-1">
                Calibrated for Philippine lowland & upland microclimates
              </p>
            </div>
            <div>
              <p className="font-mono-num text-2xl sm:text-3xl font-semibold text-[#13241B]">
                6 Health States
              </p>
              <p className="text-xs text-[#4D5F54] mt-1">
                Structured condition & leaf growth observation logs
              </p>
            </div>
            <div>
              <p className="font-mono-num text-2xl sm:text-3xl font-semibold text-[#13241B]">
                Asia/Manila
              </p>
              <p className="text-xs text-[#4D5F54] mt-1">
                Timezone-accurate watering & fertilizing schedules
              </p>
            </div>
          </div>
        </section>

        {/* Featured Specimens Section */}
        <section className="max-w-7xl mx-auto px-6 py-14 border-t border-[#E2EAE3]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-medium text-[#3B5E4C] mb-1">
                Curated Specimen Reference
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#13241B]">
                Native & Household Favorites
              </h2>
            </div>
            <Link
              href="/plants"
              className="text-sm font-semibold text-[#1B4D3E] hover:underline underline-offset-4 whitespace-nowrap"
            >
              Browse full catalog →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCatalog.items.map((plant) => (
              <Link
                key={plant.id}
                href={`/plants?highlight=${plant.id}`}
                className="group flex flex-col bg-white border border-[#DCE4DD] rounded-xl overflow-hidden hover:border-[#1B4D3E] transition-colors"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#E8EFE9]">
                  <BotanicalImage
                    src={plant.imageUrl}
                    alt={`${plant.name} (${plant.scientificName})`}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs text-[#5E7065] mb-1">
                      <span>{plant.categoryName}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{plant.difficulty}</span>
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#13241B] group-hover:text-[#1B4D3E] transition-colors">
                      {plant.name}
                    </h3>
                    <p className="text-xs italic text-[#4D5F54]">
                      {plant.scientificName}
                      {plant.localName ? ` · ${plant.localName}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-[#4D5F54] pt-2 border-t border-[#EBF0EC] font-mono-num">
                    Water every {plant.recommendedFrequencyDays} days ·{' '}
                    {plant.petSafe ? 'Pet-friendly' : 'Keep from pets'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How the Platform Works (Mechanism -> Benefit) */}
        <section className="bg-white border-y border-[#DCE4DD] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-medium text-[#3B5E4C] mb-1">
                Organized Daily Care
              </p>
              <h2
                className="font-display text-2xl sm:text-3xl font-bold text-[#13241B]"
                style={{ textWrap: 'balance' }}
              >
                Built for beginners, balcony growers, and serious collectors
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <p className="font-mono-num text-xs font-medium text-[#1B4D3E]">
                  01. Personal Plant Inventory
                </p>
                <h3 className="font-display text-lg font-bold text-[#13241B]">
                  Catalog every pot by room or balcony exposure
                </h3>
                <p className="text-sm text-[#4D5F54] leading-relaxed">
                  Record plant nicknames, acquisition dates, soil mixes, and window placement so every specimen gets location-appropriate care.
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono-num text-xs font-medium text-[#1B4D3E]">
                  02. Automated Watering & Care Reminders
                </p>
                <h3 className="font-display text-lg font-bold text-[#13241B]">
                  Complete watering in one click with automatic rescheduling
                </h3>
                <p className="text-sm text-[#4D5F54] leading-relaxed">
                  Marking a plant watered logs your note and recalculates the next watering date automatically while preventing duplicate reminders.
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono-num text-xs font-medium text-[#1B4D3E]">
                  03. Condition & Growth Timeline
                </p>
                <h3 className="font-display text-lg font-bold text-[#13241B]">
                  Catch overwatering or pests before they spread
                </h3>
                <p className="text-sm text-[#4D5F54] leading-relaxed">
                  Log leaf observations across six structured health conditions so your dashboard highlights plants needing immediate attention.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Gardening Guides */}
        <section className="max-w-7xl mx-auto px-6 py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-medium text-[#3B5E4C] mb-1">
                Philippine Gardening Knowledge
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#13241B]">
                Seasonal Care & Substrate Guides
              </h2>
            </div>
            <Link
              href="/articles"
              className="text-sm font-semibold text-[#1B4D3E] hover:underline underline-offset-4 whitespace-nowrap"
            >
              Read all guides →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map((article) => (
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
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs text-[#5E7065] mb-2">
                      <span>{article.categoryName}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono-num">{article.readTimeMinutes} min read</span>
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#13241B] group-hover:text-[#1B4D3E] transition-colors mb-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-[#4D5F54] line-clamp-2 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>
                  <p className="text-xs text-[#5E7065] pt-2 border-t border-[#EBF0EC]">
                    By {article.authorName} · {formatManilaDate(article.publishedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
