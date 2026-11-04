'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { PhotoUploadField } from '@/components/forms/PhotoUploadField';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import { apiFetch, clearClientSessionToken } from '@/lib/client/auth-client';
import { formatManilaDate } from '@/lib/utils/format';
import type {
  PlantCondition,
  PlantHealthRecord,
  PlantWithCategory,
  SafeUser,
  UserPlantDetailed,
} from '@/types/domain';

interface MyPlantsClientProps {
  initialUser: SafeUser | null;
  initialOwnedPlants: UserPlantDetailed[] | null;
  catalogPlants: PlantWithCategory[];
}

const CONDITIONS: PlantCondition[] = [
  'Healthy',
  'Needs Water',
  'Overwatered',
  'Pest Infestation',
  'Disease',
  'Needs Attention',
];

export function MyPlantsClient({
  initialUser,
  initialOwnedPlants,
  catalogPlants,
}: MyPlantsClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(initialUser);
  const [plants, setPlants] = useState<UserPlantDetailed[]>(
    initialOwnedPlants ?? []
  );
  const [hydrating, setHydrating] = useState(
    !initialUser || initialOwnedPlants === null
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // Add plant form state
  const [selectedPlantId, setSelectedPlantId] = useState(
    catalogPlants[0]?.id ?? ''
  );
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('Living Room Window');
  const [acquiredAt, setAcquiredAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Edit plant modal state
  const [editingPlant, setEditingPlant] = useState<UserPlantDetailed | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCustomImg, setEditCustomImg] = useState('');

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Health & History modal state
  const [healthTarget, setHealthTarget] = useState<UserPlantDetailed | null>(null);
  const [healthRecords, setHealthRecords] = useState<PlantHealthRecord[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [newCondition, setNewCondition] = useState<PlantCondition>('Healthy');
  const [newHealthNotes, setNewHealthNotes] = useState('');
  const [newHealthPhoto, setNewHealthPhoto] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUser && initialOwnedPlants !== null) {
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
        const listRes = await apiFetch('/api/my-plants');
        if (!listRes.ok) {
          if (!cancelled) router.replace('/login');
          return;
        }
        const listData = await listRes.json();
        if (!cancelled) {
          setUser(meData.user);
          setPlants(listData.items ?? []);
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
  }, [initialUser, initialOwnedPlants, router]);

  async function reloadPlants() {
    const res = await apiFetch('/api/my-plants');
    if (res.ok) {
      const data = await res.json();
      setPlants(data.items);
    }
    router.refresh();
  }

  async function handleAddPlant(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch('/api/my-plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: selectedPlantId,
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
        setError(data?.error?.message ?? 'Could not add plant.');
        return;
      }

      setShowAddModal(false);
      setNickname('');
      setNotes('');
      setCustomImageUrl('');
      await reloadPlants();
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(plant: UserPlantDetailed) {
    setEditingPlant(plant);
    setEditNickname(plant.nickname);
    setEditLocation(plant.location);
    setEditNotes(plant.notes);
    setEditCustomImg(plant.customImageUrl ?? '');
    setError(null);
  }

  async function handleUpdatePlant(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlant) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/my-plants/${editingPlant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: editNickname,
          location: editLocation,
          notes: editNotes,
          customImageUrl: editCustomImg.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Could not update plant.');
        return;
      }
      setEditingPlant(null);
      await reloadPlants();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePlant(id: string) {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/my-plants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDeleteId(null);
        await reloadPlants();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openHealthDrawer(plant: UserPlantDetailed) {
    setHealthTarget(plant);
    setLoadingHealth(true);
    setNewCondition('Healthy');
    setNewHealthNotes('');
    setNewHealthPhoto('');
    setError(null);

    try {
      const res = await apiFetch(`/api/my-plants/${plant.id}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthRecords(data.records);
      }
    } finally {
      setLoadingHealth(false);
    }
  }

  async function handleLogHealth(e: React.FormEvent) {
    e.preventDefault();
    if (!healthTarget) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/my-plants/${healthTarget.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: newCondition,
          notes: newHealthNotes,
          imageUrl: newHealthPhoto.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Failed to log health observation.');
        return;
      }
      setNewHealthNotes('');
      setNewHealthPhoto('');

      const listRes = await apiFetch(`/api/my-plants/${healthTarget.id}/health`);
      if (listRes.ok) {
        const listData = await listRes.json();
        setHealthRecords(listData.records);
      }
      await reloadPlants();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteHealthRecord(recordId: string) {
    if (!healthTarget) return;
    const res = await apiFetch(`/api/health/${recordId}`, { method: 'DELETE' });
    if (res.ok) {
      setHealthRecords((prev) => prev.filter((r) => r.id !== recordId));
      await reloadPlants();
    }
  }

  if (hydrating || !user) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[#E5ECE6] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
          <div className="h-64 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <WorkspaceShell user={user} sectionTitle="My Personal Plant Collection">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#5E7065] font-mono-num">
              {plants.length} {plants.length === 1 ? 'plant' : 'plants'} tracked
            </p>
            <p className="text-sm text-[#4D5F54]">
              Manage nicknames, placements, acquisition history, and health observations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Personal Plant</span>
          </button>
        </div>

        {plants.length === 0 ? (
          <div className="bg-white border border-[#DCE4DD] rounded-xl p-12 text-center space-y-3">
            <p className="font-display text-lg font-bold text-[#13241B]">
              Your personal plant collection is empty
            </p>
            <p className="text-sm text-[#4D5F54] max-w-md mx-auto">
              Add your first plant to start receiving automated watering schedules and tracking leaf health over time.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg cursor-pointer"
            >
              Add First Plant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plants.map((item) => {
              const isHealthy = item.latestCondition === 'Healthy';
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#DCE4DD] rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="aspect-[16/9] w-full bg-[#E8EFE9] overflow-hidden">
                    <BotanicalImage
                      src={item.customImageUrl ?? item.plant.imageUrl}
                      alt={item.nickname}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#5E7065]">
                            {item.plant.name} ·{' '}
                            <span className="italic">
                              {item.plant.scientificName}
                            </span>
                          </p>
                          <h3 className="font-display text-xl font-bold text-[#13241B]">
                            {item.nickname}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-semibold shrink-0">
                          {isHealthy ? (
                            <CheckCircle2 className="w-4 h-4 text-[#16803C]" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                          )}
                          <span
                            className={
                              isHealthy ? 'text-[#16803C]' : 'text-[#B45309]'
                            }
                          >
                            {item.latestCondition}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#4D5F54]">
                        <span>Location: {item.location}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono-num">
                          Acquired {formatManilaDate(item.acquiredAt)}
                        </span>
                      </p>

                      {item.notes && (
                        <p className="text-xs text-[#37493E] leading-relaxed bg-[#F7F9F7] p-3 rounded-lg">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#EBF0EC] flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openHealthDrawer(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B4D3E] bg-[#EAF2EC] hover:bg-[#DCE9DF] rounded-lg transition-colors cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Health Log & History</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#4D5F54] hover:text-[#13241B] border border-[#DCE4DD] rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleDeletePlant(item.id)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 text-xs text-[#4D5F54] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            aria-label={`Delete ${item.nickname}`}
                            className="p-1.5 text-[#5E7065] hover:text-[#B91C1C] border border-[#DCE4DD] rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Personal Plant Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white border border-[#DCE4DD] rounded-2xl max-w-lg w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#13241B]">
                  Add Plant to Collection
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg text-[#4D5F54] hover:bg-[#F2F5F2] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5C6CB] text-xs text-[#991B1B]">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddPlant} className="space-y-4">
                <div>
                  <label
                    htmlFor="select-catalog-plant"
                    className="block text-xs font-semibold text-[#13241B] mb-1"
                  >
                    Catalog Species
                  </label>
                  <select
                    id="select-catalog-plant"
                    value={selectedPlantId}
                    onChange={(e) => setSelectedPlantId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  >
                    {catalogPlants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.scientificName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="new-nickname"
                      className="block text-xs font-semibold text-[#13241B] mb-1"
                    >
                      Plant Nickname
                    </label>
                    <input
                      id="new-nickname"
                      type="text"
                      required
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g., Lanai Monstera"
                      className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-location"
                      className="block text-xs font-semibold text-[#13241B] mb-1"
                    >
                      Placement Location
                    </label>
                    <input
                      id="new-location"
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="new-acquired"
                    className="block text-xs font-semibold text-[#13241B] mb-1"
                  >
                    Acquisition Date
                  </label>
                  <input
                    id="new-acquired"
                    type="date"
                    required
                    value={acquiredAt}
                    onChange={(e) => setAcquiredAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg font-mono-num"
                  />
                </div>

                <PhotoUploadField
                  label="Plant Photo (Optional)"
                  value={customImageUrl}
                  onChange={setCustomImageUrl}
                  helperText="Upload your actual plant photo (JPG, PNG, WebP, GIF · max 5 MB). Uses catalog photo if skipped."
                />

                <div>
                  <label
                    htmlFor="new-plant-notes"
                    className="block text-xs font-semibold text-[#13241B] mb-1"
                  >
                    Personal Care Notes
                  </label>
                  <textarea
                    id="new-plant-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Pot size, nursery source, or substrate mix..."
                    className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium text-[#4D5F54] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Saving...' : 'Save Plant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Personal Plant Modal */}
        {editingPlant && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white border border-[#DCE4DD] rounded-2xl max-w-lg w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#13241B]">
                  Edit {editingPlant.nickname}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingPlant(null)}
                  aria-label="Close edit modal"
                  className="p-1.5 rounded-lg text-[#4D5F54] hover:bg-[#F2F5F2] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePlant} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    required
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <PhotoUploadField
                  label="Plant Photo"
                  value={editCustomImg}
                  onChange={setEditCustomImg}
                  helperText="Upload a fresh photo of your plant, or remove to revert to the catalog photo."
                />

                <div>
                  <label className="block text-xs font-semibold text-[#13241B] mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlant(null)}
                    className="px-4 py-2 text-xs font-medium text-[#4D5F54] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg cursor-pointer"
                  >
                    {submitting ? 'Updating...' : 'Update Plant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Plant Health Tracking Modal */}
        {healthTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white border border-[#DCE4DD] rounded-2xl max-w-2xl w-full p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 border-b border-[#E6ECE7] pb-4">
                <div>
                  <p className="text-xs text-[#5E7065]">
                    Plant Health & Growth Log
                  </p>
                  <h2 className="font-display text-xl font-bold text-[#13241B]">
                    {healthTarget.nickname}
                  </h2>
                  <p className="text-xs text-[#4D5F54]">
                    {healthTarget.plant.name} · {healthTarget.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHealthTarget(null)}
                  aria-label="Close health log"
                  className="p-1.5 rounded-lg text-[#4D5F54] hover:bg-[#F2F5F2] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5C6CB] text-xs text-[#991B1B]">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleLogHealth}
                className="space-y-3 bg-[#F7F9F7] p-4 rounded-xl border border-[#DCE4DD]"
              >
                <p className="text-xs font-semibold text-[#13241B]">
                  Record New Condition Observation
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="block text-xs font-semibold text-[#13241B] mb-1">
                      Current Condition
                    </label>
                    <select
                      value={newCondition}
                      onChange={(e) =>
                        setNewCondition(e.target.value as PlantCondition)
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE4DD] rounded-lg"
                    >
                      {CONDITIONS.map((cond) => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>
                  <PhotoUploadField
                    label="Condition Photo (Optional)"
                    value={newHealthPhoto}
                    onChange={setNewHealthPhoto}
                    variant="compact"
                    helperText="Upload leaf or soil photo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4D5F54] mb-1">
                    Growth or Symptom Notes
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newHealthNotes}
                    onChange={(e) => setNewHealthNotes(e.target.value)}
                    placeholder="Describe new leaf growth, soil moisture, or pest spots..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE4DD] rounded-lg"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Recording...' : 'Save Observation'}
                  </button>
                </div>
              </form>

              {/* Previous Health Records */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-bold text-[#13241B]">
                  Previous Observations ({healthRecords.length})
                </h3>
                {loadingHealth ? (
                  <div className="space-y-2">
                    <div className="h-14 bg-[#EFF3F0] rounded-lg animate-pulse" />
                    <div className="h-14 bg-[#EFF3F0] rounded-lg animate-pulse" />
                  </div>
                ) : healthRecords.length === 0 ? (
                  <p className="text-xs text-[#5E7065]">
                    No health records logged yet for this plant.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#E6ECE7] border border-[#DCE4DD] rounded-xl overflow-hidden">
                    {healthRecords.map((rec) => (
                      <li
                        key={rec.id}
                        className="p-4 flex items-start justify-between gap-4 bg-white"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {rec.imageUrl && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#E8EFE9] border border-[#DCE4DD] shrink-0">
                              <BotanicalImage
                                src={rec.imageUrl}
                                alt={`${rec.condition} observation`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs font-semibold text-[#13241B]">
                              <span>{rec.condition}</span>
                              <span aria-hidden="true"> · </span>
                              <span className="font-normal font-mono-num text-[#5E7065]">
                                {formatManilaDate(rec.recordedAt)}
                              </span>
                            </p>
                            <p className="text-xs text-[#4D5F54] leading-relaxed">
                              {rec.notes}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteHealthRecord(rec.id)}
                          aria-label="Delete health record"
                          className="p-1.5 text-[#5E7065] hover:text-[#B91C1C] rounded cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
