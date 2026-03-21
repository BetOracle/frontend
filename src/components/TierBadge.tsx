import { cn } from '@/lib/utils';
import { Tier } from '@/types';
import { Star } from 'lucide-react';

interface TierBadgeProps {
  tier: Tier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierConfig = {
  bronze: {
    label: 'Bronze',
    stars: 1,
    className: 'bg-[hsl(30,60%,50%/0.15)] text-bronze border-bronze/30',
  },
  silver: {
    label: 'Silver',
    stars: 2,
    className: 'bg-[hsl(0,0%,75%/0.15)] text-silver border-silver/30',
  },
  gold: {
    label: 'Gold',
    stars: 3,
    className: 'bg-[hsl(51,100%,50%/0.15)] text-gold border-gold/30',
  },
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5 gap-0.5',
  md: 'text-sm px-3 py-1 gap-1',
  lg: 'text-base px-4 py-1.5 gap-1.5',
};

const starSizeMap = {
  sm: 10,
  md: 12,
  lg: 14,
};

export function TierBadge({ tier, size = 'md', className }: TierBadgeProps) {
  if (!tier) {
    return (
      <span className={cn(
        'inline-flex items-center rounded-full border font-medium',
        'bg-muted/50 text-muted-foreground border-border',
        sizeMap[size],
        className,
      )}>
        No Access
      </span>
    );
  }

  const config = tierConfig[tier];
  const starSize = starSizeMap[size];

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-semibold',
      config.className,
      sizeMap[size],
      className,
    )}>
      <span className="flex">
        {Array.from({ length: config.stars }).map((_, i) => (
          <Star key={i} size={starSize} className="fill-current" />
        ))}
      </span>
      {config.label}
    </span>
  );
}
