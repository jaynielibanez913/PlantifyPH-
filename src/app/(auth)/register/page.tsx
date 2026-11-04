'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import {
  clearClientSessionToken,
  setClientSessionToken,
} from '@/lib/client/auth-client';

export default function RegisterPage() {
  const router = useRouter();
  void router;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('Metro Manila, Philippines');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      clearClientSessionToken();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          location: location.trim() || 'Metro Manila, Philippines',
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Could not create your account.');
        setLoading(false);
        return;
      }

      if (data?.sessionToken) {
        setClientSessionToken(data.sessionToken);
      }

      window.location.assign('/dashboard');
    } catch {
      setError('Network error during registration. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F9F7]">
      <header className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-[#13241B]"
        >
          PlantifyPH
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold text-[#1B4D3E] hover:underline underline-offset-4"
        >
          Sign In
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-white border border-[#DCE4DD] rounded-2xl p-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-[#3B5E4C] mb-1">
              Join the Community
            </p>
            <h1 className="font-display text-2xl font-bold text-[#13241B]">
              Create your PlantifyPH account
            </h1>
            <p className="text-sm text-[#4D5F54] mt-1">
              Track your household plants, schedule watering reminders, and log growth milestones.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5C6CB] text-xs text-[#991B1B]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-semibold text-[#13241B] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-[#13241B] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@example.ph"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>

            <div>
              <label
                htmlFor="reg-location"
                className="block text-xs font-semibold text-[#13241B] mb-1.5"
              >
                City / Province in the Philippines
              </label>
              <input
                id="reg-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Quezon City, Cebu City, Davao, Baguio"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-semibold text-[#13241B] mb-1.5"
              >
                Password (minimum 6 characters)
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E7065] hover:text-[#13241B] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-xs text-center text-[#4D5F54]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#1B4D3E] hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
