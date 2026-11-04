'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Droplets,
  History,
  Plus,
  Trash2,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { apiFetch, clearClientSessionToken } from '@/lib/client/auth-client';
import { formatManilaDate, formatRelativeDays } from '@/lib/utils/format';
import type {
  ReminderDetailed,
  ReminderType,
  SafeUser,
  UserPlantDetailed,
  WateringScheduleDetailed,
} from '@/types/domain';

interface SchedulesClientProps {
  initialUser: SafeUser | null;
  initialOwnedPlants: UserPlantDetailed[] | null;
  initialSchedules: WateringScheduleDetailed[] | null;
  initialReminders: ReminderDetailed[] | null;
}

export function SchedulesClient({
  initialUser,
  initialOwnedPlants,
  initialSchedules,
  initialReminders,
}: SchedulesClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(initialUser);
  const [ownedPlants, setOwnedPlants] = useState<UserPlantDetailed[]>(
    initialOwnedPlants ?? []
  );
  const [schedules, setSchedules] = useState<WateringScheduleDetailed[]>(
    initialSchedules ?? []
  );
  const [reminders, setReminders] = useState<ReminderDetailed[]>(
    initialReminders ?? []
  );
  const [hydrating, setHydrating] = useState(
    !initialUser ||
      initialOwnedPlants === null ||
      initialSchedules === null ||
      initialReminders === null
  );
  const [activeTab, setActiveTab] = useState<'watering' | 'reminders'>('watering');

  const unscheduledPlants = ownedPlants.filter(
    (up) => !schedules.some((s) => s.userPlantId === up.id)
  );
  const [wsPlantId, setWsPlantId] = useState(unscheduledPlants[0]?.id ?? '');
  const [wsFrequency, setWsFrequency] = useState(4);
  const [wsNextDate, setWsNextDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [expandedLogsId, setExpandedLogsId] = useState<string | null>(null);
  const [editingFrequencyId, setEditingFrequencyId] = useState<string | null>(null);
  const [tempFreq, setTempFreq] = useState(4);

  const [remPlantId, setRemPlantId] = useState<string>('');
  const [remTitle, setRemTitle] = useState('');
  const [remDesc, setRemDesc] = useState('');
  const [remType, setRemType] = useState<ReminderType>('FERTILIZING');
  const [remDate, setRemDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (
      initialUser &&
      initialOwnedPlants !== null &&
      initialSchedules !== null &&
      initialReminders !== null
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
          if (!cancelled) router.replace('/login');
          return;
        }
        const [upRes, wsRes, remRes] = await Promise.all([
          apiFetch('/api/my-plants'),
          apiFetch('/api/watering'),
          apiFetch('/api/reminders'),
        ]);
        if (!upRes.ok || !wsRes.ok || !remRes.ok) {
          if (!cancelled) router.replace('/login');
          return;
        }
        const [upData, wsData, remData] = await Promise.all([
          upRes.json(),
          wsRes.json(),
          remRes.json(),
        ]);
        if (!cancelled) {
          setUser(meData.user);
          setOwnedPlants(upData.items ?? []);
          setSchedules(wsData.schedules ?? []);
          setReminders(remData.reminders ?? []);
          setHydrating(false);
        }
      } catch {
        if (!cancelled) router.replace('/login');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    initialUser,
    initialOwnedPlants,
    initialSchedules,
    initialReminders,
    router,
  ]);

  useEffect(() => {
    const available = ownedPlants.filter(
      (up) => !schedules.some((s) => s.userPlantId === up.id)
    );
    if (available.length > 0 && !available.some((p) => p.id === wsPlantId)) {
      setWsPlantId(available[0].id);
    }
  }, [ownedPlants, schedules, wsPlantId]);

  async function refreshAll() {
    const [wsRes, remRes] = await Promise.all([
      apiFetch('/api/watering'),
      apiFetch('/api/reminders'),
    ]);
    if (wsRes.ok) {
      const wsData = await wsRes.json();
      setSchedules(wsData.schedules);
    }
    if (remRes.ok) {
      const remData = await remRes.json();
      setReminders(remData.reminders);
    }
    router.refresh();
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!wsPlantId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/watering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPlantId: wsPlantId,
          frequencyDays: wsFrequency,
          nextWateringAt: wsNextDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data?.error?.message ?? 'Could not create schedule.',
        });
        return;
      }
      setMessage({ type: 'success', text: 'Watering schedule created.' });
      await refreshAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteWatering(id: string, name: string) {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/watering/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Watered thoroughly and checked pot drainage.',
        }),
      });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Logged watering for ${name} and advanced next schedule.`,
        });
        await refreshAll();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveFrequency(id: string) {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/watering/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequencyDays: tempFreq }),
      });
      if (res.ok) {
        setEditingFrequencyId(null);
        await refreshAll();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSchedule(id: string) {
    const res = await apiFetch(`/api/watering/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshAll();
    }
  }

  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPlantId: remPlantId || null,
          title: remTitle,
          description: remDesc,
          reminderType: remType,
          scheduledAt: remDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data?.error?.message ?? 'Could not schedule reminder.',
        });
        return;
      }
      setRemTitle('');
      setRemDesc('');
      setMessage({ type: 'success', text: 'Care reminder scheduled.' });
      await refreshAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleReminder(rem: ReminderDetailed) {
    const nextStatus = rem.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    const res = await apiFetch(`/api/reminders/${rem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await refreshAll();
    }
  }

  async function handleDeleteReminder(id: string) {
    const res = await apiFetch(`/api/reminders/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshAll();
    }
  }

  if (hydrating || !user) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[#E5ECE6] rounded-lg animate-pulse" />
        <div className="h-64 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <WorkspaceShell user={user} sectionTitle="Watering Schedules & Care Reminders">
      <div className="space-y-6">
        {/* Segmented Control */}
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-[#DCE4DD] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('watering')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'watering'
                ? 'bg-[#1B4D3E] text-white'
                : 'text-[#4D5F54] hover:text-[#13241B]'
            }`}
          >
            Watering Schedules ({schedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'reminders'
                ? 'bg-[#1B4D3E] text-white'
                : 'text-[#4D5F54] hover:text-[#13241B]'
            }`}
          >
            Care Reminders ({reminders.length})
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium ${
              message.type === 'success'
                ? 'bg-[#EAF5EE] border-[#B7DFC5] text-[#155724]'
                : 'bg-[#FDF2F2] border-[#F5C6CB] text-[#991B1B]'
            }`}
          >
            {message.text}
          </div>
        )}

        {activeTab === 'watering' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              {schedules.length === 0 ? (
                <div className="bg-white border border-[#DCE4DD] rounded-xl p-10 text-center text-sm text-[#4D5F54]">
                  No watering schedules configured yet. Add one using the form on the right.
                </div>
              ) : (
                schedules.map((ws) => {
                  const rel = formatRelativeDays(ws.nextWateringAt);
                  const logsOpen = expandedLogsId === ws.id;
                  return (
                    <div
                      key={ws.id}
                      className="bg-white border border-[#DCE4DD] rounded-xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-display text-lg font-bold text-[#13241B]">
                            {ws.userPlantNickname}
                          </h3>
                          <p className="text-xs text-[#5E7065]">
                            <span>{ws.plantName}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{ws.location}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono-num">
                              Every {ws.frequencyDays} days
                            </span>
                          </p>
                          <p className="text-xs mt-1 font-mono-num">
                            <span
                              className={
                                rel.tone === 'overdue'
                                  ? 'text-[#B91C1C] font-semibold'
                                  : rel.tone === 'due-soon'
                                  ? 'text-[#B45309] font-semibold'
                                  : 'text-[#3B5E4C]'
                              }
                            >
                              {rel.label} ({formatManilaDate(ws.nextWateringAt)})
                            </span>
                            {' · '}
                            <span className="text-[#5E7065]">
                              Last watered: {formatManilaDate(ws.lastWateredAt)}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() =>
                              handleCompleteWatering(ws.id, ws.userPlantNickname)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer disabled:opacity-60"
                          >
                            <Droplets className="w-3.5 h-3.5" />
                            <span>Mark Watered</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingFrequencyId(
                                editingFrequencyId === ws.id ? null : ws.id
                              );
                              setTempFreq(ws.frequencyDays);
                            }}
                            className="px-3 py-2 text-xs font-medium text-[#4D5F54] border border-[#DCE4DD] rounded-lg hover:text-[#13241B] cursor-pointer"
                          >
                            Interval
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLogsId(logsOpen ? null : ws.id)
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#4D5F54] border border-[#DCE4DD] rounded-lg hover:text-[#13241B] cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span className="font-mono-num">
                              Logs ({ws.logs.length})
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(ws.id)}
                            aria-label={`Delete schedule for ${ws.userPlantNickname}`}
                            className="p-2 text-[#5E7065] hover:text-[#B91C1C] border border-[#DCE4DD] rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {editingFrequencyId === ws.id && (
                        <div className="flex items-center gap-3 pt-3 border-t border-[#EBF0EC]">
                          <label className="text-xs font-medium text-[#4D5F54]">
                            Water every (days):
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={tempFreq}
                            onChange={(e) => setTempFreq(Number(e.target.value))}
                            className="w-20 px-2.5 py-1.5 text-xs border border-[#DCE4DD] rounded-lg font-mono-num"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveFrequency(ws.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      )}

                      {logsOpen && (
                        <div className="pt-3 border-t border-[#EBF0EC] space-y-2">
                          <p className="text-xs font-semibold text-[#13241B]">
                            Watering History
                          </p>
                          {ws.logs.length === 0 ? (
                            <p className="text-xs text-[#5E7065]">
                              No completed watering logs recorded yet.
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {ws.logs.map((log) => (
                                <li
                                  key={log.id}
                                  className="text-xs text-[#4D5F54] flex items-center justify-between gap-3 bg-[#F7F9F7] px-3 py-2 rounded-lg"
                                >
                                  <span>{log.notes}</span>
                                  <span className="font-mono-num text-[#5E7065] shrink-0">
                                    {formatManilaDate(log.wateredAt)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white border border-[#DCE4DD] rounded-xl p-5 space-y-4">
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Create Watering Schedule
                </h3>
                {unscheduledPlants.length === 0 ? (
                  <p className="text-xs text-[#4D5F54] leading-relaxed">
                    All plants in your collection currently have an active watering schedule. Add another plant or edit an existing interval on the left.
                  </p>
                ) : (
                  <form onSubmit={handleCreateSchedule} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#13241B] mb-1">
                        Select Plant
                      </label>
                      <select
                        value={wsPlantId}
                        onChange={(e) => setWsPlantId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                      >
                        {unscheduledPlants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nickname} ({p.plant.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#13241B] mb-1">
                        Frequency (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        required
                        value={wsFrequency}
                        onChange={(e) => setWsFrequency(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg font-mono-num"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#13241B] mb-1">
                        Next Watering Date
                      </label>
                      <input
                        type="date"
                        required
                        value={wsNextDate}
                        onChange={(e) => setWsNextDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg font-mono-num"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Schedule</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[#DCE4DD] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#DCE4DD]">
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Scheduled Care Reminders
                </h3>
              </div>
              {reminders.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#4D5F54]">
                  No care reminders created yet.
                </div>
              ) : (
                <ul className="divide-y divide-[#EBF0EC]">
                  {reminders.map((rem) => {
                    const done = rem.status === 'COMPLETED';
                    return (
                      <li
                        key={rem.id}
                        className="px-5 py-4 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <p
                            className={`text-sm font-semibold ${
                              done
                                ? 'line-through text-[#7B8B80]'
                                : 'text-[#13241B]'
                            }`}
                          >
                            {rem.title}
                          </p>
                          <p className="text-xs text-[#5E7065]">
                            <span>{rem.reminderType}</span>
                            {rem.plantLabel ? ` · ${rem.plantLabel}` : ''}
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono-num">
                              Scheduled {formatManilaDate(rem.scheduledAt)}
                            </span>
                          </p>
                          {rem.description && (
                            <p className="text-xs text-[#4D5F54]">
                              {rem.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleReminder(rem)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                              done
                                ? 'bg-[#F2F5F2] text-[#4D5F54] border-[#DCE4DD]'
                                : 'bg-[#EAF2EC] text-[#1B4D3E] border-[#C5DBC9]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{done ? 'Reopen' : 'Complete'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReminder(rem.id)}
                            aria-label={`Delete reminder ${rem.title}`}
                            className="p-1.5 text-[#5E7065] hover:text-[#B91C1C] border border-[#DCE4DD] rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white border border-[#DCE4DD] rounded-xl p-5 space-y-4">
                <h3 className="font-display text-base font-bold text-[#13241B]">
                  Add Care Reminder
                </h3>
                <form onSubmit={handleCreateReminder} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Reminder Type
                    </label>
                    <select
                      value={remType}
                      onChange={(e) => setRemType(e.target.value as ReminderType)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    >
                      <option value="FERTILIZING">Fertilizing</option>
                      <option value="PRUNING">Pruning</option>
                      <option value="REPOTTING">Repotting</option>
                      <option value="WATERING">Watering</option>
                      <option value="CUSTOM">Custom Task</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Associated Plant (Optional)
                    </label>
                    <select
                      value={remPlantId}
                      onChange={(e) => setRemPlantId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    >
                      <option value="">General Garden Task</option>
                      {ownedPlants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nickname}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      required
                      value={remTitle}
                      onChange={(e) => setRemTitle(e.target.value)}
                      placeholder="e.g., Apply vermicast top-dressing"
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      required
                      value={remDate}
                      onChange={(e) => setRemDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg font-mono-num"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={remDesc}
                      onChange={(e) => setRemDesc(e.target.value)}
                      placeholder="Dosage, shears sanitation, or pot size..."
                      className="w-full px-3 py-2 text-xs bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer"
                  >
                    Schedule Reminder
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
