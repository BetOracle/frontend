import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ConfidenceBarProps {
  confidence: number;
  showLabel?: boolean;
  className?: string;
  animate?: boolean;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'bg-success';
  if (confidence >= 70) return 'bg-success/80';
  if (confidence >= 60) return 'bg-warning';
  return 'bg-muted-foreground';
}

export function ConfidenceBar({ confidence, showLabel = true, className, animate = true }: ConfidenceBarProps) {
  const [width, setWidth] = useState(animate ? 0 : confidence);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setWidth(confidence), 100);
      return () => clearTimeout(timer);
    }
  }, [confidence, animate]);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', getConfidenceColor(confidence))}
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-mono font-medium text-foreground min-w-[3ch] text-right">
          {confidence}%
        </span>
      )}
    </div>
  );
}
