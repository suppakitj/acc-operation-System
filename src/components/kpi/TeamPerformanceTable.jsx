import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DEPT_LABELS = {
  management: 'Mgmt', accounting: 'Acct', consulting: 'Consult',
  audit: 'Audit', billing: 'Billing', it: 'IT',
};

export default function TeamPerformanceTable({ performanceData, isMD }) {
  const [sortField, setSortField] = useState('onTimeRate');
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    return [...performanceData].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [performanceData, sortField, sortDir]);

  const SortHeader = ({ field, children, className = '' }) => (
    <th className={`px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => toggleSort(field)}>
      {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">
          {isMD ? 'Performance by Department' : 'Performance by Staff'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-4 px-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <SortHeader field="name">{isMD ? 'แผนก' : 'พนักงาน'}</SortHeader>
                <SortHeader field="totalTasks" className="text-center">งานที่รับ</SortHeader>
                <SortHeader field="onTimeCount" className="text-center">ตรงเวลา</SortHeader>
                <SortHeader field="onTimeRate">On-Time Rate</SortHeader>
                <SortHeader field="avgDays" className="hidden sm:table-cell">Avg Days</SortHeader>
                <SortHeader field="overdueCount" className="text-center">Overdue</SortHeader>
                <SortHeader field="dueDateChangedPct" className="hidden md:table-cell">Due Changed</SortHeader>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">ไม่มีข้อมูล</td></tr>
              ) : sorted.map((row, i) => (
                <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="px-2 py-2.5">
                    <div>
                      <p className="text-xs font-semibold">{row.name}</p>
                      {!isMD && row.department && (
                        <Badge variant="outline" className="text-[8px] mt-0.5">{DEPT_LABELS[row.department] || row.department}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-center">{row.totalTasks}</td>
                  <td className="px-2 py-2.5 text-xs text-center text-green-700">{row.onTimeCount}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.onTimeRate >= 90 ? 'bg-green-500' : row.onTimeRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(row.onTimeRate, 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold">{row.onTimeRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-xs hidden sm:table-cell">{row.avgDays.toFixed(1)} วัน</td>
                  <td className="px-2 py-2.5 text-xs text-center">
                    {row.overdueCount > 0 ? <span className="text-red-600 font-medium">{row.overdueCount}</span> : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-2 py-2.5 text-xs hidden md:table-cell">
                    {row.dueDateChangedCount > 0 ? (
                      <span className="text-amber-600">{row.dueDateChangedCount} ({row.dueDateChangedPct.toFixed(0)}%)</span>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}