'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useUserProfile } from '@/lib/UserProfileContext';

export default function AppNav() {
  const { profile, pendingEngagementCount } = useUserProfile();
  const pathname = usePathname();

  if (!profile) return null;

  const isPlanner = profile.role === 'planner';

  const navLinks = isPlanner
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/planner/profile', label: 'My Profile' },
        { href: '/planner/inbox', label: 'Inbox', badge: pendingEngagementCount },
      ]
    : [
        { href: '/my-wedding', label: 'My Wedding' },
        { href: '/my-wedding/planners', label: 'My Planners' },
        { href: '/find-planner', label: 'Find a Planner' },
      ];

  return (
    <header className="bg-cream border-b border-stone print:hidden">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={isPlanner ? '/dashboard' : '/my-wedding'} className="text-xl font-heading font-semibold tracking-tight">
            <span className="text-charcoal">Wed</span><span className="text-sage">Ledger</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'text-charcoal border-b-2 border-sage'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                {link.label}
                {'badge' in link && typeof link.badge === 'number' && link.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white bg-rose rounded-full">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-warm-gray hidden sm:inline">{profile.display_name}</span>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
