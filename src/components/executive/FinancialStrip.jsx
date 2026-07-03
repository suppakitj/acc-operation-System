import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const fmt = (v) => v == null ? '—' : new Intl.NumberFormat('th-TH').format(v);

function Delta({ cur, prev }) {
  if (prev == null || cur == null) return null;
  const d = cur - prev;
  if (d === 0) return <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><Minus className="w-3 h-3" />0</span>;
  const positive = d > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{typeof cur === 'number' && cur < 1000 ? d.toFixed(1) : fmt(Math.round(d))}
    </span>
  );
}

export default function FinancialStrip({ fin, prevFin }) {
  const tiles = [
    { label: 'Revenue', value: `฿${fmt(fin.totalRevenue)}`, prev: prevFin?.totalRevenue, cur: fin.totalRevenue },
    { label: 'Revenue / FTE', value: `฿${fmt(fin.revenuePerFte)}`, prev: prevFin?.revenuePerFte, cur: fin.revenuePerFte },
    { label: 'Gross Margin', value: fin.grossMarginPct != null ? `${fin.grossMarginPct}%` : '—', prev: prevFin?.grossMarginPct, cur: fin.grossMarginPct },
    { label: 'Cost Efficiency', value: fin.costEfficiency != null ? `${fin.costEfficiency}×` : '—', prev: prevFin?.costEfficiency, cur: fin.costEfficiency, sub: '฿ รายได้ต่อ ฿ ต้นทุน' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-[11px] text-muted-foreground font-medium">{t.label}</p>
            <p className="text-xl font-bold mt-1">{t.value}</p>
            <div className="flex items-center gap-2 mt-1">
              <Delta cur={t.cur} prev={t.prev} />
            </div>
            {t.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{t.sub}</p>}
          </Card>
        ))}
      </div>
      {fin.unattributedRevenue > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          รายได้ที่ยังไม่ถูก attribute: ฿{fmt(fin.unattributedRevenue)} (ไม่มี time entry)
        </div>
      )}
    </div>
  );
}