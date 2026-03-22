import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react';

export function SmartRefreshBanner() {
  const { hasNewPicks, lastUpdated, applyNewPicks } = useStore();
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      setTimeAgo(formatDistanceToNow(lastUpdated, { addSuffix: true }));
    }, 60000);
    setTimeAgo(formatDistanceToNow(lastUpdated, { addSuffix: true }));
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <>
      {lastUpdated && !hasNewPicks && (
        <div className="w-full text-center py-1.5 text-[10px] text-muted-foreground/50 bg-background border-b border-white/5 uppercase tracking-wider font-mono">
          Updated {timeAgo}
        </div>
      )}
      <AnimatePresence>
        {hasNewPicks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary/20 border-b border-primary/30 overflow-hidden"
          >
            <button
              onClick={applyNewPicks}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold tracking-wide text-primary hover:bg-primary/30 transition-colors shadow-[inset_0_0_20px_rgba(53,208,127,0.1)]"
            >
              <RefreshCw size={16} />
              New picks available — tap to refresh
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
