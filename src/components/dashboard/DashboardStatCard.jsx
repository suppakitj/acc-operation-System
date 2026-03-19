import React from 'react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  blue: { bg: 'bg-white border-l-4 border-l-blue-500', icon: 'bg-blue-50 text-blue-600', text: 'text-blue-700' },
  red: { bg: 'bg-white border-l-4 border-l-red-500', icon: 'bg-red-50 text-red-600', text: 'text-red-700' },
  yellow: { bg: 'bg-white border-l-4 border-l-amber-500', icon: 'bg-amber-50 text-amber-600', text: 'text-amber-700' },
  green: { bg: 'bg-white border-l-4 border-l-emerald-500', icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700' },
  purple: { bg: 'bg-white border-l-4 border-l-purple-500', icon: 'bg-purple-50 text-purple-600', text: 'text-purple-700' },
  default: { bg: 'bg-white border-l-4 border-l-slate-300', icon: 'bg-slate-50 text-slate-500', text: 'text-foreground' },
};

export default function DashboardStatCard({ title, value, icon: Icon, variant = 'default', subtitle }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <div className={cn('rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-shadow hover:shadow-md', v.bg)}>
      {Icon && (
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', v.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className={cn('text-2xl font-bold leading-tight', v.text)}>{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}