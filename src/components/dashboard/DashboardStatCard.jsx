import React from 'react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  default: 'bg-card border-border text-foreground',
};

const ICON_COLORS = {
  blue: 'text-blue-500',
  red: 'text-red-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  purple: 'text-purple-500',
  default: 'text-muted-foreground',
};

export default function DashboardStatCard({ title, value, icon: Icon, variant = 'default' }) {
  return (
    <div className={cn('rounded-xl border p-3 md:p-4 flex flex-col justify-between min-h-[80px]', VARIANTS[variant])}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] md:text-xs font-medium uppercase tracking-wide opacity-80">{title}</p>
        {Icon && <Icon className={cn('w-4 h-4 md:w-5 md:h-5', ICON_COLORS[variant])} />}
      </div>
      <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}