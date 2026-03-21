import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Gem, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/track-record', label: 'Track', icon: BarChart3 },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const { walletConnected } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          const Icon = item.icon;

          if (item.to.startsWith('/dashboard') && !walletConnected) return null;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-md transition-colors min-w-[60px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
