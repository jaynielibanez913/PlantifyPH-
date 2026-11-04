import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { getCurrentUser } from '@/lib/auth/session';
import { listPlantCategories, listPlants } from '@/features/plants/service';
import { CatalogExplorer } from '@/features/plants/CatalogExplorer';

export default async function PlantCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const catalog = listPlants({ limit: 50 });
  const categories = listPlantCategories();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F7]">
      <PublicHeader user={user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        <div className="max-w-2xl mb-8">
          <p className="text-xs font-medium text-[#3B5E4C] mb-1">
            Philippine Botanical Reference
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#13241B] mb-2">
            Plant Catalog
          </h1>
          <p className="text-sm sm:text-base text-[#4D5F54]">
            Browse tropical specimens, kitchen herbs, fruiting trees, and resilient houseplants with locally tested light, watering, and potting mix guidelines.
          </p>
        </div>

        <CatalogExplorer
          initialPlants={catalog.items}
          categories={categories}
          isAuthenticated={Boolean(user)}
          initialHighlightId={params.highlight ?? null}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
