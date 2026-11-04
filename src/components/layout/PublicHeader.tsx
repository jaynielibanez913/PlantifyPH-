'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, getClientSessionToken } from '@/lib/client/auth-client';
import type { SafeUser } from '@/types/domain';

interface PublicHeaderProps {
  user: SafeUser | null;
}

export function PublicHeader({ user: initialUser }: PublicHeaderProps) {
  const [user, setUser] = useState<SafeUser | null>(initialUser);

  useEffect(() => {
    const token = getClientSessionToken();
    if (!token) {
      setUser(initialUser);
      return;
    }

    let cancelled = false;
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  return (
    <header className="sticky top-0 z-30 bg-[#F7F9F7]/95 backdrop-blur border-b border-[#DCE4DD]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Brand Title, single line */}
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-[#13241B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4D3E]"
        >
          PlantifyPH
        </Link>

        {/* Zone 2: 4–5 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4D5F54]"
        >
          <Link
            href="/plants"
            className="hover:text-[#13241B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Plant Catalog
          </Link>
          <Link
            href="/articles"
            className="hover:text-[#13241B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Care Guides
          </Link>
          <Link
            href={user ? '/my-plants' : '/login'}
            className="hover:text-[#13241B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            My Plants
          </Link>
          <Link
            href={user ? '/schedules' : '/login'}
            className="hover:text-[#13241B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Schedules
          </Link>
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="hover:text-[#13241B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          {user ? (
            <Link
              href={user.role === 'ADMIN' ? '/admin' : '/dashboard'}
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4D3E]"
            >
              {user.role === 'ADMIN' ? 'Admin Console' : 'Open Garden'}
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-[#1B4D3E] rounded-lg hover:bg-[#143B2F] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4D3E]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center gap-5 overflow-x-auto px-6 py-2.5 border-t border-[#E6ECE7] text-xs font-medium text-[#4D5F54]"
      >
        <Link href="/plants" className="hover:text-[#13241B] whitespace-nowrap shrink-0">
          Plant Catalog
        </Link>
        <Link href="/articles" className="hover:text-[#13241B] whitespace-nowrap shrink-0">
          Care Guides
        </Link>
        <Link
          href={user ? '/my-plants' : '/login'}
          className="hover:text-[#13241B] whitespace-nowrap shrink-0"
        >
          My Plants
        </Link>
        <Link
          href={user ? '/schedules' : '/login'}
          className="hover:text-[#13241B] whitespace-nowrap shrink-0"
        >
          Schedules
        </Link>
      </nav>
    </header>
  );
}
