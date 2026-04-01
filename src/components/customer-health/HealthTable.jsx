import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADE_CONFIG } from '@/lib/customerHealth';

const GRADE_BADGE = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-teal-100 text-teal-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
};

const ROW_BG = {
  A: 'bg-green-50/50',
  D: 'bg-orange-50/50',
  F: 'bg-red-50/50',
};

function formatCurrency(n) {
  if (!n) return '—';
  return '฿' + n.toLocaleString('th-TH');
}

export default function HealthTable({ data, onViewDetail }) {
  return (
    <div className="bg-card rounded-lg border overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-muted/20">
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ลูกค้า</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Health Score</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">On-Time</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Avg เลื่อน Due</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Avg ชม./งาน</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">รายได้/เดือน</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">งาน</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-10"></th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const h = row.health;
            const hasData = h && h.score !== null;
            const grade = hasData ? h.grade : null;
            return (
              <tr key={row.id} className={cn("border-b last:border-b-0 hover:bg-muted/10 transition-colors", ROW_BG[grade])}>
                <td className="px-3 py-2.5">
                  <p className="text-xs font-medium">{row.company_name}</p>
                  <p className="text-[10px] text-muted-foreground">{row.customer_code}</p>
                </td>
                <td className="px-3 py-2.5">
                  {hasData ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", h.score >= 80 ? 'bg-green-500' : h.score >= 65 ? 'bg-teal-500' : h.score >= 50 ? 'bg-yellow-500' : h.score >= 35 ? 'bg-orange-500' : 'bg-red-500')}
                            style={{ width: `${h.score}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold">{h.score}</span>
                      <Badge className={cn("text-[9px] px-1.5 py-0 border-0", GRADE_BADGE[grade])}>{grade}</Badge>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">ยังไม่มีข้อมูล</span>
                  )}
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  {hasData ? (
                    <span className={cn("text-xs font-medium", h.onTimeRate >= 80 ? 'text-green-600' : h.onTimeRate >= 50 ? 'text-yellow-600' : 'text-red-600')}>
                      {h.onTimeRate}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="text-xs">{hasData ? h.avgDueDateChanges + ' ครั้ง' : '—'}</span>
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  <span className="text-xs">{hasData ? h.avgHoursPerTask + ' ชม.' : '—'}</span>
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  <span className="text-xs font-medium">{formatCurrency(row.monthly_fee)}</span>
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  <span className="text-xs">{hasData ? h.totalTasks : 0}</span>
                </td>
                <td className="px-3 py-2.5">
                  {hasData && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetail(row)}>
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}