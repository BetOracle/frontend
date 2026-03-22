import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { useSmartRefresh } from '@/hooks/useSmartRefresh';
import { SmartRefreshBanner } from '../SmartRefreshBanner';

interface BaseLayoutProps {
  children: React.ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
  useSmartRefresh();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <SmartRefreshBanner />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
