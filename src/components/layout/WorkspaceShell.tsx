'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarClock,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserCircle,
  X,
} from 'lucide-react';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import { apiFetch, clearClientSessionToken } from '@/lib/client/auth-client';
import type { SafeUser } from '@/types/domain';

interface WorkspaceShellProps {
  user: SafeUser;
  sectionTitle: string;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}

export function WorkspaceShell({
  user,
  sectionTitle,
  primaryAction,
  children,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/my-plants', label: 'My Plants', icon: Leaf },
    { href: '/schedules', label: 'Watering & Reminders', icon: CalendarClock },
    { href: '/plants', label: 'Plant Catalog', icon: Search },
    { href: '/articles', label: 'Care Guides', icon: BookOpen },
    { href: '/profile', label: 'Profile & Security', icon: UserCircle },
  ];

  if (user.role === 'ADMIN') {
    navItems.push({ href: '/admin', label: 'Admin Console', icon: ShieldCheck });
  }

  async function handleLogout() {
    setSigningOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearClientSessionToken();
      window.location.assign('/login');
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F7F9F7] text-[#13241B]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 border-r border-[#DCE4DD] bg-white">
        <div className="px-6 py-5 border-b border-[#DCE4DD]">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-[#13241B] whitespace-nowrap"
          >
            PlantifyPH
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#EAF2EC] text-[#1B4D3E] font-semibold'
                    : 'text-[#4D5F54] hover:bg-[#F3F6F3] hover:text-[#13241B]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#DCE4DD] space-y-3">
          <div className="flex items-center gap-3 px-2">
            {user.avatarUrl ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border border-[#DCE4DD] bg-[#EAF2EC] shrink-0">
                <BotanicalImage
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#EAF2EC] text-[#1B4D3E] text-xs font-bold flex items-center justify-center shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#13241B] truncate">{user.name}</p>
              <p className="text-xs text-[#5E7065] truncate">
                {user.role === 'ADMIN' ? 'Administrator' : 'Gardener'} · {user.location}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#4D5F54] hover:text-[#13241B] border border-[#DCE4DD] rounded-lg hover:bg-[#F7F9F7] transition-colors cursor-pointer disabled:opacity-60"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-[#DCE4DD]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE4DD]">
              <Link
                href="/"
                className="font-display text-lg font-bold text-[#13241B]"
                onClick={() => setMobileOpen(false)}
              >
                PlantifyPH
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-[#4D5F54] hover:bg-[#F3F6F3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active
                        ? 'bg-[#EAF2EC] text-[#1B4D3E] font-semibold'
                        : 'text-[#4D5F54] hover:bg-[#F3F6F3]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#DCE4DD]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-[#4D5F54] border border-[#DCE4DD] rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#DCE4DD] px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#4D5F54] hover:bg-[#F3F6F3]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-[#5E7065] hidden sm:inline whitespace-nowrap">
                Workspace
              </span>
              <span className="text-[#96A79B] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-bold text-base sm:text-lg text-[#13241B] truncate">
                {sectionTitle}
              </h1>
            </div>
          </div>

          {primaryAction && <div className="shrink-0">{primaryAction}</div>}
        </header>

        <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
