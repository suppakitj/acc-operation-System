import React from 'react';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
};

const ACTIVE_MAP = {
  blue: 'bg-blue-600 text-white border-blue-600',
  amber: 'bg-amber-600 text-white border-amber-600',
  purple: 'bg-purple-600 text-white border-purple-600',
  green: 'bg-green-600 text-white border-green-600',
  orange: 'bg-orange-600 text-white border-orange-600',
};

export default function CategoryPills({ categories, active, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect('all')}
        className={cn(
          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
          active === 'all'
            ? 'bg-foreground text-background border-foreground'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        )}
      >
        ทั้งหมด
      </button>
      {categories.filter(c => c.status === 'active').map(cat => (
        <button
          key={cat.slug}
          onClick={() => onSelect(cat.slug)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            active === cat.slug
              ? (ACTIVE_MAP[cat.color] || 'bg-primary text-primary-foreground border-primary')
              : (COLOR_MAP[cat.color] || 'bg-muted text-muted-foreground border-border')
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}