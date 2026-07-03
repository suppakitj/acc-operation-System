import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolvePeriod, resolveComparison, shiftPeriod } from '@/utils/periodUtils';

const TYPES = [
  { id: 'monthly',   label: 'รายเดือน' },
  { id: 'quarterly', label: 'รายไตรมาส' },
  { id: 'yearly',    label: 'รายปี' },
  { id: 'custom',    label: 'กำหนดเอง' },
];
const COMPARE = [
  { id: 'previous_period',       label: 'งวดก่อนหน้า' },
  { id: 'same_period_last_year', label: 'งวดเดียวกันปีก่อน' },
  { id: 'peer_group',            label: 'เทียบเพื่อนร่วมตำแหน่ง' },
  { id: 'personal_baseline',     label: 'ค่าเฉลี่ยตนเอง 12 เดือน' },
];

export default function PeriodSelector({ value, onChange, fiscalStart = 1, showComparison = true }) {
  const set = (patch) => {
    const next = { ...value, ...patch };
    const resolved = resolvePeriod(next, fiscalStart);
    const cmp = showComparison ? resolveComparison(next.comparison, next, fiscalStart) : null;
    onChange({ ...next, resolved, comparisonResolved: cmp });
  };
  const step = (dir) => set(shiftPeriod(value, dir));
  const resolved = resolvePeriod(value, fiscalStart);

  const Pill = ({ active, children, onClick }) => (
    <button onClick={onClick} className={cn(
      'px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
    )}>{children}</button>
  );

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => <Pill key={t.id} active={value.type === t.id} onClick={() => set({ type: t.id })}>{t.label}</Pill>)}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {value.type !== 'custom' && (
          <Button variant="outline" size="icon" onClick={() => step(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        )}

        {value.type === 'monthly' && (
          <input type="month" value={value.month}
            onChange={(e) => set({ month: e.target.value })}
            className="h-9 rounded-md border px-3 text-sm bg-background" />
        )}
        {value.type === 'quarterly' && (
          <>
            <select value={value.quarter} onChange={(e) => set({ quarter: Number(e.target.value) })}
              className="h-9 rounded-md border px-3 text-sm bg-background">
              {[1,2,3,4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </select>
            <input type="number" value={value.year} onChange={(e) => set({ year: Number(e.target.value) })}
              className="h-9 w-24 rounded-md border px-3 text-sm bg-background" />
          </>
        )}
        {value.type === 'yearly' && (
          <input type="number" value={value.year} onChange={(e) => set({ year: Number(e.target.value) })}
            className="h-9 w-28 rounded-md border px-3 text-sm bg-background" />
        )}
        {value.type === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={value.from} onChange={(e) => set({ from: e.target.value })}
              className="h-9 rounded-md border px-3 text-sm bg-background" />
            <span className="text-muted-foreground">→</span>
            <input type="date" value={value.to} onChange={(e) => set({ to: e.target.value })}
              className="h-9 rounded-md border px-3 text-sm bg-background" />
          </div>
        )}

        {value.type !== 'custom' && (
          <Button variant="outline" size="icon" onClick={() => step(1)}><ChevronRight className="w-4 h-4" /></Button>
        )}
        <span className="ml-1 text-sm font-semibold text-foreground">{resolved.label}</span>
        <span className="text-xs text-muted-foreground">({resolved.from} → {resolved.to})</span>
      </div>

      {showComparison && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          <span className="text-xs font-medium text-muted-foreground mr-1">เทียบกับ:</span>
          {COMPARE.map((c) => <Pill key={c.id} active={value.comparison === c.id} onClick={() => set({ comparison: c.id })}>{c.label}</Pill>)}
        </div>
      )}
    </div>
  );
}