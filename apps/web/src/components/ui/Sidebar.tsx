'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { logoutApi } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  ClipboardList,
  Users,
  MapPin,
  BarChart3,
  LogOut,
  Zap,
  HelpCircle,
  Clock,
  Activity,
  Columns,
  Bell,
  Users2,
  RefreshCw,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    href: '/map',
    label: 'Live Map',
    icon: <Map className="w-4 h-4" />,
  },
  {
    href: '/jobs',
    label: 'Jobs',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    href: '/workers',
    label: 'Workers',
    icon: <Users className="w-4 h-4" />,
  },
  {
    href: '/dispatch',
    label: 'Dispatch Board',
    icon: <Columns className="w-4 h-4" />,
  },
  {
    href: '/activity',
    label: 'Activity',
    icon: <Activity className="w-4 h-4" />,
  },
  {
    href: '/geofences',
    label: 'Geofences',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    href: '/recurring-jobs',
    label: 'Recurring',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    href: '/timesheet',
    label: 'Timesheet',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: <Bell className="w-4 h-4" />,
  },
  {
    href: '/teams',
    label: 'Teams',
    icon: <Users2 className="w-4 h-4" />,
  },
];

interface SidebarProps {
  onShowHelp?: () => void;
}

export function Sidebar({ onShowHelp }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore logout API errors
    }
    logout();
    router.replace('/login');
  };

  const initials =
    (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '');

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-slate-900 text-white flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight">FieldOps</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Help button */}
      {onShowHelp && (
        <div className="px-2 pb-2">
          <button
            onClick={onShowHelp}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Help &amp; Tour
          </button>
        </div>
      )}

      {/* User section */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400
            hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
