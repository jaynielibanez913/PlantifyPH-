'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { PhotoUploadField } from '@/components/forms/PhotoUploadField';
import {
  apiFetch,
  clearClientSessionToken,
  getClientSessionToken,
} from '@/lib/client/auth-client';
import { formatManilaDate } from '@/lib/utils/format';
import type {
  ActivityEvent,
  Article,
  ArticleCategory,
  PlantCategory,
  PlantDifficulty,
  PlantWithCategory,
  SafeUser,
} from '@/types/domain';

interface AdminSummary {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    catalogPlants: number;
    plantCategories: number;
    personalPlantsTracked: number;
    publishedArticles: number;
    activeReminders: number;
  };
  recentActivities: ActivityEvent[];
}

interface AdminConsoleClientProps {
  initialUser: SafeUser | null;
  initialSummary: AdminSummary | null;
  initialUsers: Array<SafeUser & { ownedPlantsCount: number }> | null;
  initialPlants: PlantWithCategory[];
  plantCategories: PlantCategory[];
  initialArticles: Article[] | null;
  articleCategories: ArticleCategory[];
}

export function AdminConsoleClient({
  initialUser,
  initialSummary,
  initialUsers,
  initialPlants,
  plantCategories,
  initialArticles,
  articleCategories,
}: AdminConsoleClientProps) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<SafeUser | null>(initialUser);
  const [tab, setTab] = useState<'overview' | 'users' | 'plants' | 'articles'>(
    'overview'
  );
  const [summary, setSummary] = useState<AdminSummary | null>(initialSummary);
  const [users, setUsers] = useState<
    Array<SafeUser & { ownedPlantsCount: number }>
  >(initialUsers ?? []);
  const [plants, setPlants] = useState<PlantWithCategory[]>(initialPlants);
  const [articles, setArticles] = useState<Article[]>(initialArticles ?? []);
  const [hydrating, setHydrating] = useState(
    !initialUser ||
      initialUser.role !== 'ADMIN' ||
      !initialSummary ||
      !initialUsers ||
      !initialArticles
  );

  // New Catalog Plant state
  const [pName, setPName] = useState('');
  const [pLocal, setPLocal] = useState('');
  const [pSci, setPSci] = useState('');
  const [pCat, setPCat] = useState(plantCategories[0]?.id ?? '');
  const [pDiff, setPDiff] = useState<PlantDifficulty>('Easy');
  const [pFreq, setPFreq] = useState(5);
  const [pSun, setPSun] = useState('Bright indirect light');
  const [pWater, setPWater] = useState('Every 5 days when top soil dries');
  const [pSoil, setPSoil] = useState('Coco chips, pumice, and vermicast');
  const [pTemp, setPTemp] = useState('22°C – 32°C');
  const [pTox, setPTox] = useState('Non-toxic to household pets');
  const [pPetSafe, setPPetSafe] = useState(true);
  const [pImg, setPImg] = useState('');
  const [pDesc, setPDesc] = useState('');

  // New Article state
  const [aTitle, setATitle] = useState('');
  const [aCat, setACat] = useState(articleCategories[0]?.id ?? '');
  const [aSeason, setASeason] = useState('Year-Round PH');
  const [aImg, setAImg] = useState('');
  const [aExcerpt, setAExcerpt] = useState('');
  const [aContent, setAContent] = useState('');

  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const hasClientToken = Boolean(getClientSessionToken());
    if (
      !hasClientToken &&
      initialUser?.role === 'ADMIN' &&
      initialSummary &&
      initialUsers &&
      initialArticles
    ) {
      setHydrating(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const meRes = await apiFetch('/api/auth/me');
        const meData = meRes.ok ? await meRes.json() : null;
        if (!meData?.user) {
          clearClientSessionToken();
          if (!cancelled) window.location.assign('/login');
          return;
        }
        if (meData.user.role !== 'ADMIN') {
          if (!cancelled) window.location.assign('/dashboard');
          return;
        }

        // If SSR already loaded fresh admin data for this exact admin user, reuse it immediately
        if (
          initialUser?.id === meData.user.id &&
          initialSummary &&
          initialUsers &&
          initialArticles
        ) {
          if (!cancelled) {
            setAdminUser(meData.user);
            setHydrating(false);
          }
          return;
        }

        const [sumRes, usrRes, pltRes, artRes] = await Promise.all([
          apiFetch('/api/admin/dashboard'),
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/plants'),
          apiFetch('/api/admin/articles'),
        ]);
        if (!sumRes.ok || !usrRes.ok || !pltRes.ok || !artRes.ok) {
          if (!cancelled) window.location.assign('/dashboard');
          return;
        }
        const [sumData, usrData, pltData, artData] = await Promise.all([
          sumRes.json(),
          usrRes.json(),
          pltRes.json(),
          artRes.json(),
        ]);
        if (!cancelled) {
          setAdminUser(meData.user);
          setSummary(sumData);
          setUsers(usrData.users ?? []);
          setPlants(pltData.items ?? []);
          setArticles(artData.articles ?? []);
          setHydrating(false);
        }
      } catch {
        if (!cancelled) window.location.assign('/login');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialUser, initialSummary, initialUsers, initialArticles]);

  async function refreshAdmin() {
    const [sumRes, usrRes, pltRes, artRes] = await Promise.all([
      apiFetch('/api/admin/dashboard'),
      apiFetch('/api/admin/users'),
      apiFetch('/api/admin/plants'),
      apiFetch('/api/admin/articles'),
    ]);
    if (sumRes.ok) setSummary(await sumRes.json());
    if (usrRes.ok) setUsers((await usrRes.json()).users);
    if (pltRes.ok) setPlants((await pltRes.json()).items);
    if (artRes.ok) setArticles((await artRes.json()).articles);
    router.refresh();
  }

  async function handleToggleUserStatus(
    target: SafeUser & { ownedPlantsCount: number }
  ) {
    setBusy(true);
    setBanner(null);
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: target.id,
          active: !target.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          type: 'error',
          text: data?.error?.message ?? 'Failed to update user status.',
        });
        return;
      }
      setBanner({
        type: 'success',
        text: `Updated status for ${target.email}.`,
      });
      await refreshAdmin();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCatalogPlant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBanner(null);
    try {
      const res = await apiFetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pName,
          localName: pLocal,
          scientificName: pSci,
          categoryId: pCat,
          difficulty: pDiff,
          recommendedFrequencyDays: pFreq,
          sunlight: pSun,
          watering: pWater,
          soil: pSoil,
          temperature: pTemp,
          toxicity: pTox,
          petSafe: pPetSafe,
          imageUrl: pImg || '/images/hero-atelier.jpg',
          description: pDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          type: 'error',
          text: data?.error?.message ?? 'Could not add catalog specimen.',
        });
        return;
      }
      setPName('');
      setPLocal('');
      setPSci('');
      setPImg('');
      setPDesc('');
      setBanner({
        type: 'success',
        text: 'Added new plant specimen to public catalog.',
      });
      await refreshAdmin();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCatalogPlant(id: string) {
    const res = await apiFetch(`/api/plants/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBanner({ type: 'success', text: 'Removed specimen from catalog.' });
      await refreshAdmin();
    }
  }

  async function handleCreateArticle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBanner(null);
    try {
      const res = await apiFetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aTitle,
          categoryId: aCat,
          seasonTag: aSeason,
          excerpt: aExcerpt,
          content: aContent,
          imageUrl: aImg || '/images/courtyard-atrium.jpg',
          status: 'PUBLISHED',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          type: 'error',
          text: data?.error?.message ?? 'Could not publish guide.',
        });
        return;
      }
      setATitle('');
      setAImg('');
      setAExcerpt('');
      setAContent('');
      setBanner({
        type: 'success',
        text: 'Published new gardening guide.',
      });
      await refreshAdmin();
    } finally {
      setBusy(false);
    }
  }

  if (hydrating || !adminUser || !summary) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[#E5ECE6] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <WorkspaceShell user={adminUser} sectionTitle="Admin Management Console">
      <div className="space-y-6">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-white border border-[#DCE4DD] rounded-xl">
          {(
            [
              ['overview', 'System Reports & Activity'],
              ['users', `Users (${users.length})`],
              ['plants', `Plant Catalog (${plants.length})`],
              ['articles', `Articles (${articles.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tab === key
                  ? 'bg-[#1B4D3E] text-white'
                  : 'text-[#4D5F54] hover:text-[#13241B]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {banner && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium ${
              banner.type === 'success'
                ? 'bg-[#EAF5EE] border-[#B7DFC5] text-[#155724]'
                : 'bg-[#FDF2F2] border-[#F5C6CB] text-[#991B1B]'
            }`}
          >
            {banner.text}
          </div>
        )}

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
                <p className="text-xs text-[#5E7065]">Registered Users</p>
                <p className="font-mono-num text-2xl font-bold text-[#13241B] mt-1">
                  {summary.metrics.totalUsers}
                </p>
                <p className="text-xs text-[#4D5F54] mt-1 font-mono-num">
                  {summary.metrics.activeUsers} active accounts
                </p>
              </div>
              <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
                <p className="text-xs text-[#5E7065]">Catalog Specimens</p>
                <p className="font-mono-num text-2xl font-bold text-[#13241B] mt-1">
                  {summary.metrics.catalogPlants}
                </p>
                <p className="text-xs text-[#4D5F54] mt-1 font-mono-num">
                  Across {summary.metrics.plantCategories} categories
                </p>
              </div>
              <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
                <p className="text-xs text-[#5E7065]">Personal Plants Tracked</p>
                <p className="font-mono-num text-2xl font-bold text-[#13241B] mt-1">
                  {summary.metrics.personalPlantsTracked}
                </p>
                <p className="text-xs text-[#4D5F54] mt-1 font-mono-num">
                  {summary.metrics.activeReminders} pending reminders
                </p>
              </div>
              <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
                <p className="text-xs text-[#5E7065]">Published Guides</p>
                <p className="font-mono-num text-2xl font-bold text-[#13241B] mt-1">
                  {summary.metrics.publishedArticles}
                </p>
                <p className="text-xs text-[#4D5F54] mt-1">
                  Public knowledge articles
                </p>
              </div>
            </div>

            <div className="bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#DCE4DD]">
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Platform Activity Monitor
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F9F7] border-b border-[#DCE4DD] text-[#5E7065]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Actor</th>
                      <th className="px-5 py-3 font-semibold">Operation</th>
                      <th className="px-5 py-3 font-semibold">Target</th>
                      <th className="px-5 py-3 font-semibold text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBF0EC]">
                    {summary.recentActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-[#FAFBF9]">
                        <td className="px-5 py-3 font-medium text-[#13241B]">
                          {act.actorName}
                        </td>
                        <td className="px-5 py-3 text-[#4D5F54]">{act.action}</td>
                        <td className="px-5 py-3 font-medium text-[#13241B]">
                          {act.targetName}
                        </td>
                        <td className="px-5 py-3 text-right font-mono-num text-[#5E7065]">
                          {formatManilaDate(act.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9F7] border-b border-[#DCE4DD] text-[#5E7065]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name & Email</th>
                    <th className="px-5 py-3 font-semibold">Location</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold text-right">
                      Owned Plants
                    </th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF0EC]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAFBF9]">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[#13241B]">{u.name}</p>
                        <p className="text-[#5E7065]">{u.email}</p>
                      </td>
                      <td className="px-5 py-3 text-[#4D5F54]">{u.location}</td>
                      <td className="px-5 py-3 font-mono-num text-[#13241B]">
                        {u.role}
                      </td>
                      <td className="px-5 py-3 text-right font-mono-num text-[#13241B]">
                        {u.ownedPlantsCount}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            u.active
                              ? 'text-[#16803C] font-semibold'
                              : 'text-[#B91C1C] font-semibold'
                          }
                        >
                          {u.active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {u.id !== adminUser.id && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleUserStatus(u)}
                            className="px-3 py-1.5 text-xs font-medium border border-[#DCE4DD] rounded-lg hover:border-[#1B4D3E] cursor-pointer"
                          >
                            {u.active ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'plants' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#DCE4DD]">
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Catalog Specimens
                </h3>
              </div>
              <ul className="divide-y divide-[#EBF0EC]">
                {plants.map((p) => (
                  <li
                    key={p.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#13241B] truncate">
                        {p.name}{' '}
                        <span className="italic font-normal text-xs text-[#5E7065]">
                          ({p.scientificName})
                        </span>
                      </p>
                      <p className="text-xs text-[#5E7065]">
                        {p.categoryName} · {p.difficulty} ·{' '}
                        <span className="font-mono-num">
                          Every {p.recommendedFrequencyDays}d
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCatalogPlant(p.id)}
                      aria-label={`Remove ${p.name} from catalog`}
                      className="p-1.5 text-[#5E7065] hover:text-[#B91C1C] border border-[#DCE4DD] rounded-lg cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#DCE4DD] rounded-xl p-5 space-y-4">
              <h3 className="font-display text-base font-bold text-[#13241B]">
                Add Plant to Catalog
              </h3>
              <form onSubmit={handleCreateCatalogPlant} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Common Name
                    </label>
                    <input
                      type="text"
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="Philippine Jade Vine"
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Filipino Name
                    </label>
                    <input
                      type="text"
                      value={pLocal}
                      onChange={(e) => setPLocal(e.target.value)}
                      placeholder="Tayabak"
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Scientific Name
                  </label>
                  <input
                    type="text"
                    required
                    value={pSci}
                    onChange={(e) => setPSci(e.target.value)}
                    placeholder="Strongylodon macrobotrys"
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Category
                    </label>
                    <select
                      value={pCat}
                      onChange={(e) => setPCat(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    >
                      {plantCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Difficulty
                    </label>
                    <select
                      value={pDiff}
                      onChange={(e) =>
                        setPDiff(e.target.value as PlantDifficulty)
                      }
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Water Every (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={pFreq}
                    onChange={(e) => setPFreq(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg font-mono-num"
                  />
                </div>

                <PhotoUploadField
                  label="Specimen Photo"
                  value={pImg}
                  onChange={setPImg}
                  variant="compact"
                  fallbackPreviewUrl="/images/hero-atelier.jpg"
                  helperText="Upload specimen photo"
                />

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Sunlight & Watering Summary
                  </label>
                  <input
                    type="text"
                    required
                    value={pSun}
                    onChange={(e) => setPSun(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg mb-2"
                  />
                  <input
                    type="text"
                    required
                    value={pWater}
                    onChange={(e) => setPWater(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={12}
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="Describe native habitat, foliage traits, and care tips..."
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-[#4D5F54] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pPetSafe}
                    onChange={(e) => {
                      setPPetSafe(e.target.checked);
                      setPTox(
                        e.target.checked
                          ? 'Non-toxic to household pets'
                          : 'Keep out of reach of cats and dogs'
                      );
                    }}
                    className="accent-[#1B4D3E]"
                  />
                  <span>Pet-safe specimen</span>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Specimen to Catalog</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === 'articles' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#DCE4DD]">
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Published Gardening Articles
                </h3>
              </div>
              <ul className="divide-y divide-[#EBF0EC]">
                {articles.map((art) => (
                  <li key={art.id} className="px-5 py-4 space-y-1">
                    <p className="text-sm font-semibold text-[#13241B]">
                      {art.title}
                    </p>
                    <p className="text-xs text-[#5E7065]">
                      {art.categoryName} · {art.status} ·{' '}
                      <span className="font-mono-num">
                        {formatManilaDate(art.publishedAt ?? art.createdAt)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#DCE4DD] rounded-xl p-5 space-y-4">
              <h3 className="font-display text-base font-bold text-[#13241B]">
                Publish New Care Guide
              </h3>
              <form onSubmit={handleCreateArticle} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Guide Title
                  </label>
                  <input
                    type="text"
                    required
                    value={aTitle}
                    onChange={(e) => setATitle(e.target.value)}
                    placeholder="Propagating Hoya Cuttings in Coco Peat"
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Category
                    </label>
                    <select
                      value={aCat}
                      onChange={(e) => setACat(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    >
                      {articleCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#13241B] mb-1">
                        Season Tag
                      </label>
                      <input
                        type="text"
                        value={aSeason}
                        onChange={(e) => setASeason(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                      />
                    </div>
                  </div>

                  <PhotoUploadField
                    label="Guide Cover Photo (Optional)"
                    value={aImg}
                    onChange={setAImg}
                    variant="compact"
                    fallbackPreviewUrl="/images/courtyard-atrium.jpg"
                    helperText="Upload article cover photo"
                  />

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Summary Excerpt
                  </label>
                  <textarea
                    rows={2}
                    required
                    minLength={10}
                    value={aExcerpt}
                    onChange={(e) => setAExcerpt(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Full Guide Content
                  </label>
                  <textarea
                    rows={5}
                    required
                    minLength={30}
                    value={aContent}
                    onChange={(e) => setAContent(e.target.value)}
                    placeholder="Write detailed paragraphs separated by blank lines..."
                    className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer"
                >
                  Publish Guide
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
