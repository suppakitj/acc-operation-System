import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADE_CONFIG } from '@/lib/customerHealth';
import { useSortableTable } from '@/hooks/useSortableTable';
import SortableHeader from '@/components/shared/SortableHeader';
import { useMemo } from 'react';

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
  // Flatten health data for sorting
  const flatData = useMemo(() => data.map(row => ({
    ...row,
    _score: row.health?.score ?? -1,
    _grade: row.health?.grade || 'Z',
    _onTimeRate: row.health?.onTimeRate ?? -1,
    _avgDueDateChanges: row.health?.avgDueDateChanges ?? -1,
    _avgHoursPerTask: row.health?.avgHoursPerTask ?? -1,
    _totalTasks: row.health?.totalTasks ?? 0,
  })), [data]);

  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(flatData, '_score', 'desc');

  return (
    <div className="bg-card rounded-lg border overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-muted/20">
            <SortableHeader label="ลูกค้า" field="company_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider" />
            <SortableHeader label="Health Score" field="_score" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider" />
            <SortableHeader label="On-Time" field="_onTimeRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden md:table-cell" />
            <SortableHeader label="Avg เลื่อน Due" field="_avgDueDateChanges" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden md:table-cell" />
            <SortableHeader label="Avg ชม./งาน" field="_avgHoursPerTask" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden lg:table-cell" />
            <SortableHeader label="รายได้/เดือน" field="monthly_fee" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden lg:table-cell" />
            <SortableHeader label="งาน" field="_totalTasks" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden sm:table-cell" />
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-10"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => {
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