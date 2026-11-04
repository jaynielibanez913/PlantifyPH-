'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, CheckCircle2, Droplets, Plus } from 'lucide-react';
import type { DashboardSummary } from '@/features/dashboard/service';
import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import {
  apiFetch,
  clearClientSessionToken,
  getClientSessionToken,
} from '@/lib/client/auth-client';
import { formatManilaDate, formatRelativeDays } from '@/lib/utils/format';
import type { SafeUser } from '@/types/domain';

interface DashboardClientProps {
  initialUser: SafeUser | null;
  initialSummary: DashboardSummary | null;
}

export function DashboardClient({
  initialUser,
  initialSummary,
}: DashboardClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(initialUser);
  const [summary, setSummary] = useState<DashboardSummary | null>(initialSummary);
  const [hydrating, setHydrating] = useState(!initialUser || !initialSummary);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    const hasClientToken = Boolean(getClientSessionToken());
    if (!hasClientToken && initialUser && initialSummary) {
      setHydrating(false);
      return;
    }

    let cancelled = false;
    async function loadSessionAndSummary() {
      try {
        const meRes = await apiFetch('/api/auth/me');
        const meData = meRes.ok ? await meRes.json() : null;
        if (!meData?.user) {
          clearClientSessionToken();
          if (!cancelled) window.location.assign('/login');
          return;
        }
        if (initialUser?.id === meData.user.id && initialSummary) {
          if (!cancelled) {
            setUser(meData.user);
            setHydrating(false);
          }
          return;
        }
        const sumRes = await apiFetch('/api/dashboard');
        if (!sumRes.ok) {
          if (!cancelled) window.location.assign('/login');
          return;
        }
        const sumData = await sumRes.json();
        if (!cancelled) {
          setUser(meData.user);
          setSummary(sumData);
          setHydrating(false);
        }
      } catch {
        if (!cancelled) window.location.assign('/login');
      }
    }

    void loadSessionAndSummary();
    return () => {
      cancelled = true;
    };
  }, [initialUser, initialSummary]);

  async function refreshDashboard() {
    const res = await apiFetch('/api/dashboard');
    if (res.ok) {
      const next = await res.json();
      setSummary(next);
    }
    router.refresh();
  }

  async function handleCompleteWatering(scheduleId: string, nickname: string) {
    setBusyId(scheduleId);
    setStatusBanner(null);
    try {
      const res = await apiFetch(`/api/watering/${scheduleId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Completed from dashboard quick action.',
        }),
      });
      if (res.ok) {
        setStatusBanner(`Marked ${nickname} as watered and scheduled next cycle.`);
        await refreshDashboard();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleCompleteReminder(reminderId: string, title: string) {
    setBusyId(reminderId);
    setStatusBanner(null);
    try {
      const res = await apiFetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) {
        setStatusBanner(`Completed reminder: ${title}`);
        await refreshDashboard();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (hydrating || !user || !summary) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-56 bg-[#E5ECE6] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const { metrics } = summary;

  return (
    <WorkspaceShell
      user={user}
      sectionTitle="Garden Overview"
      primaryAction={
        <Link
          href="/my-plants"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Plant</span>
        </Link>
      }
    >
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[#5E7065]">{user.location}</p>
            <h2 className="font-display text-2xl font-bold text-[#13241B]">
              Magandang araw, {user.name.split(' ')[0]}
            </h2>
          </div>
          <p className="text-xs text-[#4D5F54] font-mono-num">
            Manila Date · {formatManilaDate(new Date().toISOString())}
          </p>
        </div>

        {statusBanner && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#EAF5EE] border border-[#B7DFC5] text-xs font-medium text-[#155724]"
          >
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {statusBanner}
            </span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Structured KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
            <p className="text-xs text-[#5E7065]">Total Plants</p>
            <p className="font-mono-num text-2xl font-bold text-[#13241B] mt-1">
              {metrics.totalPlants}
            </p>
            <p className="text-xs text-[#4D5F54] mt-1">In personal collection</p>
          </div>

          <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
            <p className="text-xs text-[#5E7065]">Healthy Plants</p>
            <p className="font-mono-num text-2xl font-bold text-[#16803C] mt-1">
              {metrics.healthyPlants}
            </p>
            <p className="text-xs text-[#4D5F54] mt-1">Thriving condition</p>
          </div>

          <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
            <p className="text-xs text-[#5E7065]">Needs Attention</p>
            <p
              className={`font-mono-num text-2xl font-bold mt-1 ${
                metrics.plantsNeedingAttention > 0
                  ? 'text-[#B45309]'
                  : 'text-[#13241B]'
              }`}
            >
              {metrics.plantsNeedingAttention}
            </p>
            <p className="text-xs text-[#4D5F54] mt-1">Flagged health logs</p>
          </div>

          <div className="bg-white border border-[#DCE4DD] rounded-xl p-4">
            <p className="text-xs text-[#5E7065]">Watering Due Soon</p>
            <p className="font-mono-num text-2xl font-bold text-[#13241B] mt-1">
              {metrics.dueWateringCount}
            </p>
            <p className="text-xs text-[#4D5F54] mt-1">Within next 24 hours</p>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white border border-[#DCE4DD] rounded-xl p-4">
            <p className="text-xs text-[#5E7065]">Pending Reminders</p>
            <p className="font-mono-num text-2xl font-bold text-[#13241B] mt-1">
              {metrics.pendingRemindersCount}
            </p>
            <p className="text-xs text-[#4D5F54] mt-1">Scheduled tasks</p>
          </div>
        </div>

        {/* Upcoming Watering & Pending Reminders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE4DD] flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Upcoming Watering Schedules
                </h3>
                <p className="text-xs text-[#5E7065]">
                  Complete watering to log hydration and advance the next due date
                </p>
              </div>
              <Link
                href="/schedules"
                className="text-xs font-semibold text-[#1B4D3E] hover:underline whitespace-nowrap"
              >
                Manage all →
              </Link>
            </div>

            {summary.upcomingWatering.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-[#13241B]">
                  No watering schedules yet
                </p>
                <p className="text-xs text-[#4D5F54]">
                  Add a plant from the catalog to generate an automatic watering schedule.
                </p>
                <Link
                  href="/plants"
                  className="inline-block mt-2 px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg"
                >
                  Browse Plant Catalog
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#EBF0EC]">
                {summary.upcomingWatering.map((item) => {
                  const rel = formatRelativeDays(item.nextWateringAt);
                  return (
                    <div
                      key={item.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#FAFBF9]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#E8EFE9] shrink-0">
                          <BotanicalImage
                            src={item.plantImageUrl}
                            alt={item.userPlantNickname}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#13241B] truncate">
                            {item.userPlantNickname}
                          </p>
                          <p className="text-xs text-[#5E7065] truncate">
                            <span>{item.location}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono-num">
                              Every {item.frequencyDays}d
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span
                              className={
                                rel.tone === 'overdue'
                                  ? 'text-[#B91C1C] font-semibold'
                                  : rel.tone === 'due-soon'
                                  ? 'text-[#B45309] font-semibold'
                                  : 'text-[#4D5F54]'
                              }
                            >
                              {rel.label}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() =>
                          handleCompleteWatering(item.id, item.userPlantNickname)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B4D3E] bg-[#EAF2EC] hover:bg-[#DCE9DF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {busyId === item.id ? 'Saving...' : 'Mark Watered'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending Care Reminders */}
          <section className="lg:col-span-5 bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE4DD] flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Pending Care Reminders
                </h3>
                <p className="text-xs text-[#5E7065]">
                  Fertilizing, pruning, repotting & custom tasks
                </p>
              </div>
              <Link
                href="/schedules"
                className="text-xs font-semibold text-[#1B4D3E] hover:underline whitespace-nowrap"
              >
                Add task →
              </Link>
            </div>

            {summary.pendingReminders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-[#13241B]">
                  All caught up on reminders
                </p>
                <p className="text-xs text-[#4D5F54]">
                  No pending fertilizing, pruning, or repotting tasks right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EBF0EC]">
                {summary.pendingReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-[#FAFBF9]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#13241B] truncate">
                        {rem.title}
                      </p>
                      <p className="text-xs text-[#5E7065] mt-0.5">
                        <span>{rem.reminderType}</span>
                        {rem.plantLabel ? ` · ${rem.plantLabel}` : ''}
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono-num">
                          {formatManilaDate(rem.scheduledAt)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busyId === rem.id}
                      onClick={() => handleCompleteReminder(rem.id, rem.title)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#13241B] border border-[#DCE4DD] rounded-lg hover:border-[#1B4D3E] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16803C]" />
                      <span>Done</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Personal Plant Health Snapshot + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE4DD] flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#13241B]">
                Plant Health Overview
              </h3>
              <Link
                href="/my-plants"
                className="text-xs font-semibold text-[#1B4D3E] hover:underline"
              >
                Log observation →
              </Link>
            </div>

            {summary.ownedPlants.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4D5F54]">
                Your collection is currently empty. Add plants to monitor their condition.
              </div>
            ) : (
              <div className="divide-y divide-[#EBF0EC]">
                {summary.ownedPlants.slice(0, 5).map((up) => {
                  const healthy = up.latestCondition === 'Healthy';
                  return (
                    <div
                      key={up.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#13241B] truncate">
                          {up.nickname}
                        </p>
                        <p className="text-xs text-[#5E7065] truncate">
                          {up.plant.name} · {up.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
                        {healthy ? (
                          <CheckCircle2
                            className="w-4 h-4 text-[#16803C]"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="w-4 h-4 text-[#B45309]"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={
                            healthy ? 'text-[#16803C]' : 'text-[#B45309]'
                          }
                        >
                          {up.latestCondition}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="lg:col-span-5 bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE4DD]">
              <h3 className="font-display text-base font-bold text-[#13241B]">
                Recent Plant Activities
              </h3>
            </div>
            {summary.recentActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4D5F54]">
                Activities appear here as you water, add plants, and log health notes.
              </div>
            ) : (
              <ul className="divide-y divide-[#EBF0EC]">
                {summary.recentActivities.map((act) => (
                  <li key={act.id} className="px-5 py-3 text-xs space-y-0.5">
                    <p className="font-medium text-[#13241B]">
                      {act.action} — <span className="font-semibold">{act.targetName}</span>
                    </p>
                    <p className="text-[#5E7065] font-mono-num">
                      {formatManilaDate(act.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Latest Gardening Articles */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#13241B]">
              Recommended Philippine Care Guides
            </h3>
            <Link
              href="/articles"
              className="text-xs font-semibold text-[#1B4D3E] hover:underline"
            >
              All articles →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.latestArticles.map((art) => (
              <Link
                key={art.id}
                href={`/articles/${art.slug}`}
                className="bg-white border border-[#DCE4DD] rounded-xl p-4 hover:border-[#1B4D3E] transition-colors space-y-2"
              >
                <p className="text-xs text-[#5E7065]">
                  {art.categoryName} ·{' '}
                  <span className="font-mono-num">{art.readTimeMinutes} min</span>
                </p>
                <h4 className="font-display text-sm font-bold text-[#13241B]">
                  {art.title}
                </h4>
                <p className="text-xs text-[#4D5F54] line-clamp-2">{art.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
