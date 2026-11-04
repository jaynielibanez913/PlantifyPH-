'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Search, X } from 'lucide-react';
import { PhotoUploadField } from '@/components/forms/PhotoUploadField';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import { apiFetch, getClientSessionToken } from '@/lib/client/auth-client';
import type { PlantCategory, PlantWithCategory } from '@/types/domain';

interface CatalogExplorerProps {
  initialPlants: PlantWithCategory[];
  categories: PlantCategory[];
  isAuthenticated: boolean;
  initialHighlightId: string | null;
}

export function CatalogExplorer({
  initialPlants,
  categories,
  isAuthenticated: initialAuth,
  initialHighlightId,
}: CatalogExplorerProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [petSafeOnly, setPetSafeOnly] = useState(false);
  const [activePlant, setActivePlant] = useState<PlantWithCategory | null>(() =>
    initialHighlightId
      ? initialPlants.find((p) => p.id === initialHighlightId) ?? null
      : null
  );

  // Add-to-collection form state inside modal
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('East Balcony');
  const [acquiredAt, setAcquiredAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!initialAuth && getClientSessionToken()) {
      apiFetch('/api/auth/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) setIsAuthenticated(true);
        })
        .catch(() => {});
    }
  }, [initialAuth]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActivePlant(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function openPlantModal(plant: PlantWithCategory) {
    setActivePlant(plant);
    setNickname(`My ${plant.name}`);
    setNotes('');
    setCustomImageUrl('');
    setFeedback(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPlants.filter((plant) => {
      if (selectedCategory !== 'all' && plant.categoryId !== selectedCategory) {
        return false;
      }
      if (selectedDifficulty !== 'all' && plant.difficulty !== selectedDifficulty) {
        return false;
      }
      if (petSafeOnly && !plant.petSafe) {
        return false;
      }
      if (q) {
        const hay = `${plant.name} ${plant.localName} ${plant.scientificName} ${plant.description}`.toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [initialPlants, search, selectedCategory, selectedDifficulty, petSafeOnly]);

  async function handleAddToMyPlants(e: React.FormEvent) {
    e.preventDefault();
    if (!activePlant) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiFetch('/api/my-plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: activePlant.id,
          nickname,
          location,
          acquiredAt,
          notes,
          customImageUrl: customImageUrl.trim() || null,
          createDefaultSchedule: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data?.error?.message ?? 'Could not add plant.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `${nickname} added to your collection with an automatic ${activePlant.recommendedFrequencyDays}-day watering schedule.`,
      });
      router.refresh();
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error while saving plant. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Controls Toolbar */}
      <div className="bg-white border border-[#DCE4DD] rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#5E7065] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by common name, Filipino name (e.g. Kapa-kapa, Tigre), or scientific name..."
              aria-label="Search plants"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by difficulty"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2.5 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg text-[#13241B] focus:outline-none focus:border-[#1B4D3E]"
            >
              <option value="all">All Difficulty Levels</option>
              <option value="Easy">Easy Care</option>
              <option value="Moderate">Moderate Care</option>
              <option value="Advanced">Advanced Care</option>
            </select>

            <button
              type="button"
              onClick={() => setPetSafeOnly((prev) => !prev)}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                petSafeOnly
                  ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                  : 'bg-[#F7F9F7] text-[#4D5F54] border-[#DCE4DD] hover:text-[#13241B]'
              }`}
            >
              {petSafeOnly ? '✓ Pet-Safe Only' : 'Pet-Safe Filter'}
            </button>
          </div>
        </div>

        {/* Interactive Category Filter Buttons */}
        <div
          role="group"
          aria-label="Plant categories"
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#1B4D3E] text-white'
                : 'bg-[#F2F5F2] text-[#4D5F54] hover:text-[#13241B]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#1B4D3E] text-white'
                  : 'bg-[#F2F5F2] text-[#4D5F54] hover:text-[#13241B]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-[#4D5F54]">
        <span className="font-mono-num">
          Showing {filtered.length} of {initialPlants.length} catalog specimens
        </span>
        {(search || selectedCategory !== 'all' || selectedDifficulty !== 'all' || petSafeOnly) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setSelectedDifficulty('all');
              setPetSafeOnly(false);
            }}
            className="text-[#1B4D3E] font-semibold hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Specimen Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#DCE4DD] rounded-xl p-12 text-center space-y-3">
          <p className="font-display text-lg font-bold text-[#13241B]">
            No matching plants found
          </p>
          <p className="text-sm text-[#4D5F54] max-w-md mx-auto">
            Try clearing your search term or switching back to All Categories to explore more Philippine plants.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setSelectedDifficulty('all');
              setPetSafeOnly(false);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg cursor-pointer"
          >
            Show All Plants
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((plant) => (
            <div
              key={plant.id}
              className="flex flex-col bg-white border border-[#DCE4DD] rounded-xl overflow-hidden hover:border-[#1B4D3E] transition-colors"
            >
              <button
                type="button"
                onClick={() => openPlantModal(plant)}
                className="text-left group flex-1 flex flex-col cursor-pointer"
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
                      <span aria-hidden="true"> · </span>
                      <span>{plant.petSafe ? 'Pet-Safe' : 'Keep from Pets'}</span>
                    </p>
                    <h2 className="font-display text-xl font-bold text-[#13241B] group-hover:text-[#1B4D3E] transition-colors">
                      {plant.name}
                    </h2>
                    <p className="text-xs italic text-[#4D5F54] mb-2">
                      {plant.scientificName}
                      {plant.localName ? ` · ${plant.localName}` : ''}
                    </p>
                    <p className="text-sm text-[#4D5F54] line-clamp-2 leading-relaxed">
                      {plant.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#EBF0EC] flex items-center justify-between text-xs text-[#3B5E4C] font-medium">
                    <span className="font-mono-num">
                      Water every {plant.recommendedFrequencyDays}d · {plant.temperature.split(' ')[0]}
                    </span>
                    <span className="underline underline-offset-4">Inspect Care →</span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Specimen Detail & Add-to-Collection Modal */}
      {activePlant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plant-modal-title"
        >
          <div className="bg-white border border-[#DCE4DD] rounded-2xl max-w-3xl w-full overflow-hidden my-8">
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-5 bg-[#E8EFE9] min-h-[240px]">
                <BotanicalImage
                  src={activePlant.imageUrl}
                  alt={activePlant.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="md:col-span-7 p-6 space-y-5 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#5E7065]">
                      {activePlant.categoryName} · {activePlant.difficulty} Difficulty
                    </p>
                    <h2
                      id="plant-modal-title"
                      className="font-display text-2xl font-bold text-[#13241B]"
                    >
                      {activePlant.name}
                    </h2>
                    <p className="text-xs italic text-[#4D5F54]">
                      {activePlant.scientificName}
                      {activePlant.localName ? ` · Local: ${activePlant.localName}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePlant(null)}
                    aria-label="Close plant details"
                    className="p-2 rounded-lg text-[#4D5F54] hover:bg-[#F2F5F2] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-[#4D5F54] leading-relaxed">
                  {activePlant.description}
                </p>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-y border-[#E6ECE7] py-4">
                  <div>
                    <dt className="font-semibold text-[#13241B]">Sunlight</dt>
                    <dd className="text-[#4D5F54] mt-0.5">{activePlant.sunlight}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#13241B]">Watering Cadence</dt>
                    <dd className="text-[#4D5F54] mt-0.5">{activePlant.watering}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#13241B]">Soil & Potting Mix</dt>
                    <dd className="text-[#4D5F54] mt-0.5">{activePlant.soil}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#13241B]">Temperature & Humidity</dt>
                    <dd className="text-[#4D5F54] mt-0.5 font-mono-num">
                      {activePlant.temperature}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-[#13241B]">Toxicity & Pet Safety</dt>
                    <dd className="text-[#4D5F54] mt-0.5">{activePlant.toxicity}</dd>
                  </div>
                </dl>

                {/* Add to Personal Collection Form */}
                <form onSubmit={handleAddToMyPlants} className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-[#13241B]">
                    Add to My Personal Plant Collection
                  </p>

                  {feedback && (
                    <div
                      className={`p-3 rounded-lg text-xs border ${
                        feedback.type === 'success'
                          ? 'bg-[#EAF5EE] border-[#B7DFC5] text-[#155724]'
                          : 'bg-[#FDF2F2] border-[#F5C6CB] text-[#991B1B]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {feedback.type === 'success' && (
                          <Check className="w-4 h-4 shrink-0" />
                        )}
                        <span>{feedback.message}</span>
                      </div>
                    </div>
                  )}

                  {isAuthenticated ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="add-nickname"
                            className="block text-xs font-medium text-[#4D5F54] mb-1"
                          >
                            Plant Nickname
                          </label>
                          <input
                            id="add-nickname"
                            type="text"
                            required
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="add-location"
                            className="block text-xs font-medium text-[#4D5F54] mb-1"
                          >
                            Home Location
                          </label>
                          <input
                            id="add-location"
                            type="text"
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g., South Lanai, Living Room"
                            className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="add-acquired"
                            className="block text-xs font-medium text-[#4D5F54] mb-1"
                          >
                            Date Acquired
                          </label>
                          <input
                            id="add-acquired"
                            type="date"
                            required
                            value={acquiredAt}
                            onChange={(e) => setAcquiredAt(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg font-mono-num focus:outline-none focus:border-[#1B4D3E]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="add-notes"
                            className="block text-xs font-medium text-[#4D5F54] mb-1"
                          >
                            Initial Notes (Optional)
                          </label>
                          <input
                            id="add-notes"
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Pot size or nursery source"
                            className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
                          />
                        </div>
                      </div>

                      <PhotoUploadField
                        label="Your Plant Photo (Optional)"
                        value={customImageUrl}
                        onChange={setCustomImageUrl}
                        variant="compact"
                        helperText="Upload photo of your potted plant"
                      />

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActivePlant(null)}
                          className="px-4 py-2 text-xs font-medium text-[#4D5F54] hover:text-[#13241B] cursor-pointer"
                        >
                          Close
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] disabled:opacity-60 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {submitting ? 'Saving...' : 'Add to My Plants'}
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-4 bg-[#F7F9F7] p-3.5 rounded-lg border border-[#DCE4DD]">
                      <p className="text-xs text-[#4D5F54]">
                        Sign in to save {activePlant.name} to your collection and enable watering reminders.
                      </p>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Sign In to Add
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
