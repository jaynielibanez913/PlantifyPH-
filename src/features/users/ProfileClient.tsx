'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { PhotoUploadField } from '@/components/forms/PhotoUploadField';
import { apiFetch, clearClientSessionToken } from '@/lib/client/auth-client';
import type { SafeUser } from '@/types/domain';

interface ProfileClientProps {
  initialUser: SafeUser | null;
}

export function ProfileClient({ initialUser }: ProfileClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(initialUser);
  const [hydrating, setHydrating] = useState(!initialUser);

  const [name, setName] = useState(initialUser?.name ?? '');
  const [location, setLocation] = useState(initialUser?.location ?? '');
  const [bio, setBio] = useState(initialUser?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialUser?.avatarUrl ?? '');
  const [notifyWatering, setNotifyWatering] = useState(
    initialUser?.notifyWatering ?? true
  );
  const [notifyReminders, setNotifyReminders] = useState(
    initialUser?.notifyReminders ?? true
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (initialUser) {
      setHydrating(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch('/api/users/me');
        if (!res.ok) {
          clearClientSessionToken();
          if (!cancelled) router.replace('/login');
          return;
        }
        const data = await res.json();
        const u: SafeUser | undefined = data?.user;
        if (!u) {
          if (!cancelled) router.replace('/login');
          return;
        }
        if (!cancelled) {
          setUser(u);
          setName(u.name);
          setLocation(u.location);
          setBio(u.bio);
          setAvatarUrl(u.avatarUrl ?? '');
          setNotifyWatering(u.notifyWatering);
          setNotifyReminders(u.notifyReminders);
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
  }, [initialUser, router]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileFeedback(null);

    try {
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location,
          bio,
          avatarUrl: avatarUrl.trim() || null,
          notifyWatering,
          notifyReminders,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileFeedback({
          type: 'error',
          text: data?.error?.message ?? 'Could not update profile.',
        });
        return;
      }
      if (data?.user) {
        setUser(data.user);
      }
      setProfileFeedback({
        type: 'success',
        text: 'Profile and notification settings saved.',
      });
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordFeedback(null);

    try {
      const res = await apiFetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordFeedback({
          type: 'error',
          text: data?.error?.message ?? 'Password update failed.',
        });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setPasswordFeedback({
        type: 'success',
        text: 'Password updated securely.',
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeactivate() {
    const res = await apiFetch('/api/users/me', { method: 'DELETE' });
    if (res.ok) {
      clearClientSessionToken();
      router.replace('/');
      router.refresh();
    }
  }

  if (hydrating || !user) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-56 bg-[#E5ECE6] rounded-lg animate-pulse" />
        <div className="h-64 bg-white border border-[#DCE4DD] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <WorkspaceShell user={user} sectionTitle="Account Profile & Security">
      <div className="max-w-3xl space-y-8">
        <section className="bg-white border border-[#DCE4DD] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#13241B]">
              Gardener Profile & Preferences
            </h2>
            <p className="text-xs text-[#5E7065]">
              Account email: {user.email} · Role: {user.role}
            </p>
          </div>

          {profileFeedback && (
            <div
              className={`p-3 rounded-lg text-xs border ${
                profileFeedback.type === 'success'
                  ? 'bg-[#EAF5EE] border-[#B7DFC5] text-[#155724]'
                  : 'bg-[#FDF2F2] border-[#F5C6CB] text-[#991B1B]'
              }`}
            >
              {profileFeedback.text}
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4">
            <PhotoUploadField
              label="Profile Photo"
              value={avatarUrl}
              onChange={setAvatarUrl}
              variant="avatar"
              helperText="Upload a profile photo from your device (JPG, PNG, WebP, or GIF · Max 5 MB)"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="prof-name"
                  className="block text-xs font-semibold text-[#13241B] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-location"
                  className="block text-xs font-semibold text-[#13241B] mb-1"
                >
                  Philippine Location / Climate Zone
                </label>
                <input
                  id="prof-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="prof-bio"
                className="block text-xs font-semibold text-[#13241B] mb-1"
              >
                Garden Bio
              </label>
              <textarea
                id="prof-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#EBF0EC]">
              <p className="text-xs font-semibold text-[#13241B]">
                Notification Preferences
              </p>
              <label className="flex items-center gap-2.5 text-xs text-[#4D5F54] cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyWatering}
                  onChange={(e) => setNotifyWatering(e.target.checked)}
                  className="rounded border-[#DCE4DD] accent-[#1B4D3E]"
                />
                <span>Enable upcoming watering schedule alerts</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-[#4D5F54] cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyReminders}
                  onChange={(e) => setNotifyReminders(e.target.checked)}
                  className="rounded border-[#DCE4DD] accent-[#1B4D3E]"
                />
                <span>Enable fertilizing, pruning, and repotting reminders</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white border border-[#DCE4DD] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#13241B]">
              Change Password
            </h2>
            <p className="text-xs text-[#5E7065]">
              Passwords are salted and hashed server-side using cryptographic scrypt derivation.
            </p>
          </div>

          {passwordFeedback && (
            <div
              className={`p-3 rounded-lg text-xs border ${
                passwordFeedback.type === 'success'
                  ? 'bg-[#EAF5EE] border-[#B7DFC5] text-[#155724]'
                  : 'bg-[#FDF2F2] border-[#F5C6CB] text-[#991B1B]'
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="curr-pass"
                  className="block text-xs font-semibold text-[#13241B] mb-1"
                >
                  Current Password
                </label>
                <input
                  id="curr-pass"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="new-pass"
                  className="block text-xs font-semibold text-[#13241B] mb-1"
                >
                  New Password (min 6 chars)
                </label>
                <input
                  id="new-pass"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] cursor-pointer disabled:opacity-60"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        {user.role !== 'ADMIN' && (
          <section className="bg-white border border-[#DCE4DD] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#991B1B]">
                Deactivate Account
              </h2>
              <p className="text-xs text-[#4D5F54] mt-0.5">
                Revokes active sessions immediately and disables account sign-in.
              </p>
            </div>

            {confirmDeactivate ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg cursor-pointer"
                >
                  Confirm Deactivation
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeactivate(false)}
                  className="px-3 py-2 text-xs text-[#4D5F54] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeactivate(true)}
                className="px-4 py-2 text-xs font-semibold text-[#991B1B] border border-[#F5C6CB] rounded-lg hover:bg-[#FDF2F2] shrink-0 cursor-pointer"
              >
                Deactivate Account
              </button>
            )}
          </section>
        )}
      </div>
    </WorkspaceShell>
  );
}
