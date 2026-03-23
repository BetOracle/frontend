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

    // 6 hours = 21600000 ms (Reduced from 15m to better match user requirement for ~4x daily refresh)
    const intervalId = setInterval(tick, 21600000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('scroll', updateInteraction);
      window.removeEventListener('click', updateInteraction);
      window.removeEventListener('keydown', updateInteraction);
    };
  }, [checkNewPicksBackground, fetchStats, fetchAgentStatus]);
}
