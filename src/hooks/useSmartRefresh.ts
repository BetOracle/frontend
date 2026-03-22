import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export function useSmartRefresh() {
  const { checkNewPicksBackground, fetchStats, fetchAgentStatus } = useStore();
  const lastInteractionTime = useRef(Date.now());

  useEffect(() => {
    const updateInteraction = () => {
      lastInteractionTime.current = Date.now();
    };

    window.addEventListener('scroll', updateInteraction, { passive: true });
    window.addEventListener('click', updateInteraction, { passive: true });
    window.addEventListener('keydown', updateInteraction, { passive: true });

    const tick = () => {
      if (document.visibilityState === 'visible') {
        checkNewPicksBackground();
        fetchStats();
        fetchAgentStatus();
      }
    };

    // 15 minutes = 900000 ms
    const intervalId = setInterval(tick, 900000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When user comes back to tab, do a background check
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', updateInteraction);
      window.removeEventListener('click', updateInteraction);
      window.removeEventListener('keydown', updateInteraction);
    };
  }, [checkNewPicksBackground, fetchStats, fetchAgentStatus]);
}
