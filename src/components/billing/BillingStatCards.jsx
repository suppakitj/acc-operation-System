import React from 'react';
import { FileText, Clock, AlertCircle, CheckCircle, Receipt, FileWarning } from 'lucide-react';

const CARDS = [
  { key: 'not_invoiced', label: 'NOT INVOICED', icon: FileText, borderColor: 'border-slate-300', iconColor: 'text-slate-400' },
  { key: 'invoiced_unpaid', label: 'INVOICED / UNPAID', icon: Clock, borderColor: 'border-yellow-400', iconColor: 'text-yellow-500', showPending: true },
  { key: 'overdue', label: 'OVERDUE', icon: AlertCircle, borderColor: 'border-red-400', iconColor: 'text-red-500', showAtRisk: true },
  { key: 'paid', label: 'PAID', icon: CheckCircle, borderColor: 'border-green-400', iconColor: 'text-green-500' },
  { key: 'missing_receipt', label: 'MISSING RECEIPT', icon: Receipt, borderColor: 'border-slate-300', iconColor: 'text-slate-400' },
  { key: 'missing_wht', label: 'MISSING WHT', icon: FileWarning, borderColor: 'border-red-400', iconColor: 'text-red-500' },
];

export default function BillingStatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {CARDS.map(card => {
        const Icon = card.icon;
        const stat = stats[card.key] || { count: 0 };
        return (
          <div key={card.key} className={`flex items-center justify-between p-3 bg-card rounded-lg border-l-4 ${card.borderColor} border shadow-sm`}>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{card.label}</p>
              <p className="text-2xl font-bold mt-0.5">{stat.count}</p>
              {card.showPending && stat.amount > 0 && (
                <p className="text-[10px] text-muted-foreground">฿{stat.amount.toLocaleString()} pending</p>
              )}
              {card.showAtRisk && stat.amount > 0 && (
                <p className="text-[10px] text-muted-foreground">฿{stat.amount.toLocaleString()} at risk</p>
              )}
            </div>
            <Icon className={`w-4 h-4 ${card.iconColor} opacity-60`} />
          </div>
        );
      })}
    </div>
  );
}