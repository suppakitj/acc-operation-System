import React from 'react';
import { Building2, CheckCircle2, AlertTriangle, UsersRound, Banknote } from 'lucide-react';

const cards = [
  { key: 'total', label: 'Total', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'active', label: 'Active', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'inactive', label: 'Inactive', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'noOwner', label: 'No Owner', icon: UsersRound, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'monthlyRev', label: 'Monthly Rev.', icon: Banknote, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', isCurrency: true },
];

export default function CustomerSummaryCards({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => {
        const val = stats[c.key] ?? 0;
        const Icon = c.icon;
        return (
          <div key={c.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.bg}`}>
            <Icon className={`w-5 h-5 ${c.color} shrink-0`} />
            <div>
              <p className="text-lg font-bold leading-tight">{c.isCurrency ? `฿${val.toLocaleString()}` : val}</p>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}