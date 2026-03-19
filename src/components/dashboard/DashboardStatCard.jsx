import React from 'react';
import { cn } from '@/lib/utils';

const ICON_BG = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
  green: 'bg-emerald-500',
  purple: 'bg-purple-500',
  default: 'bg-slate-400',
};

const VALUE_COLOR = {
  blue: 'text-foreground',
  red: 'text-red-600',
  yellow: 'text-foreground',
  green: 'text-foreground',
  purple: 'text-foreground',
  default: 'text-foreground',
};

export default function DashboardStatCard({ title, value, icon: Icon, variant = 'default' }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm">
      {Icon && (
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', ICON_BG[variant] || ICON_BG.default)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground leading-tight">{title}</p>
        <p className={cn('text-2xl font-bold leading-tight mt-0.5', VALUE_COLOR[variant] || VALUE_COLOR.default)}>{value}</p>
      </div>
    </div>
  );
}