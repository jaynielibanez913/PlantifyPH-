'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import {
  clearClientSessionToken,
  setClientSessionToken,
} from '@/lib/client/auth-client';

export default function LoginPage() {
  const router = useRouter();
  void router;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCredentials(targetEmail: string, targetPassword: string) {
    setLoading(true);
    setError(null);
    try {
      clearClientSessionToken();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: targetEmail.trim().toLowerCase(),
          password: targetPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Invalid email or password.');
        setLoading(false);
        return;
      }

      if (data?.sessionToken) {
        setClientSessionToken(data.sessionToken);
      }

      const destination =
        data?.user?.role === 'ADMIN' ? '/admin' : '/dashboard';
      window.location.assign(destination);
    } catch {
      setError('Network error while signing in. Please try again.');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCredentials(email, password);
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
          href="/register"
          className="text-sm font-semibold text-[#1B4D3E] hover:underline underline-offset-4"
        >
          Create Account
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-white border border-[#DCE4DD] rounded-2xl p-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-[#3B5E4C] mb-1">Welcome Back</p>
            <h1 className="font-display text-2xl font-bold text-[#13241B]">
              Sign in to PlantifyPH
            </h1>
            <p className="text-sm text-[#4D5F54] mt-1">
              Manage your personal plant collection, watering schedules, and health logs.
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
                htmlFor="login-email"
                className="block text-xs font-semibold text-[#13241B] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.ph"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F9F7] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#13241B] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Instant Demo Access for Testing USER and ADMIN Roles */}
          <div className="pt-4 border-t border-[#E6ECE7] space-y-2.5">
            <p className="text-xs font-medium text-[#5E7065]">
              Quick Sign-In with Pre-Seeded Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setEmail('maria.santos@plantify.ph');
                  setPassword('PlantifyUser123!');
                  void submitCredentials('maria.santos@plantify.ph', 'PlantifyUser123!');
                }}
                className="px-3 py-2 text-xs font-semibold text-[#13241B] bg-[#F2F6F3] border border-[#DCE4DD] rounded-lg hover:border-[#1B4D3E] transition-colors cursor-pointer whitespace-nowrap"
              >
                Gardener Demo (User)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setEmail('admin@plantify.ph');
                  setPassword('PlantifyAdmin123!');
                  void submitCredentials('admin@plantify.ph', 'PlantifyAdmin123!');
                }}
                className="px-3 py-2 text-xs font-semibold text-[#13241B] bg-[#F2F6F3] border border-[#DCE4DD] rounded-lg hover:border-[#1B4D3E] transition-colors cursor-pointer whitespace-nowrap"
              >
                Curator Demo (Admin)
              </button>
            </div>
          </div>

          <p className="text-xs text-center text-[#4D5F54]">
            New to PlantifyPH?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#1B4D3E] hover:underline"
            >
              Register a free account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
