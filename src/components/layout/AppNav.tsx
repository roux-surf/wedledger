'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useUserProfile } from '@/lib/UserProfileContext';

export default function AppNav() {
  const { profile } = useUserProfile();
  const pathname = usePathname();

  if (!profile) return null;

  const isPlanner = profile.role === 'planner';

  const navLinks = isPlanner
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/marketplace', label: 'Marketplace', disabled: true },
      ]
    : [
        { href: '/my-wedding', label: 'My Wedding' },
        { href: '/find-planner', label: 'Find a Planner', disabled: true },
      ];

  return (
    <header className="bg-white border-b border-slate-200 print:hidden">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={isPlanner ? '/dashboard' : '/my-wedding'} className="text-lg font-bold text-slate-900">
            WedLedger
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) =>
              link.disabled ? (
                <span
                  key={link.href}
                  className="relative group px-3 py-1.5 text-sm text-slate-400 cursor-default"
                >
                  {link.label}
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-xs bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Coming soon
                  </span>
                </span>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    pathname === link.href
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:inline">{profile.display_name}</span>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
