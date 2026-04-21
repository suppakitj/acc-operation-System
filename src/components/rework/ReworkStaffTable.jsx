import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const SEV_COLORS = {
  minor: 'bg-green-100 text-green-700',
  major: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
};

export default function ReworkStaffTable({ staffStats }) {
  const [sortField, setSortField] = useState('rework_weighted');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = [...staffStats].sort((a, b) => {
    const va = a[sortField] || 0;
    const vb = b[sortField] || 0;
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />;
  };

  const onlyWithRework = sorted.filter(s => s.rejected_count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-5 h-5 text-red-600" />
          สรุปรายบุคคล ({onlyWithRework.length} คนที่มีงานถูกส่งกลับ)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2.5 text-left font-semibold">พนักงาน</th>
                <th className="px-3 py-2.5 text-left font-semibold">แผนก</th>
                <th className="px-3 py-2.5 text-center font-semibold cursor-pointer hover:text-primary" onClick={() => toggleSort('rejected_count')}>
                  ส่งกลับ <SortIcon field="rejected_count" />
                </th>
                <th className="px-3 py-2.5 text-center font-semibold cursor-pointer hover:text-primary" onClick={() => toggleSort('rework_weighted')}>
                  คะแนนถ่วง <SortIcon field="rework_weighted" />
                </th>
                <th className="px-3 py-2.5 text-center font-semibold">Severity</th>
                <th className="px-3 py-2.5 text-left font-semibold">ปัญหาที่พบบ่อย</th>
                <th className="px-3 py-2.5 text-center font-semibold cursor-pointer hover:text-primary" onClick={() => toggleSort('total_tasks')}>
                  งานทั้งหมด <SortIcon field="total_tasks" />
                </th>
                <th className="px-3 py-2.5 text-center font-semibold">Scorecard</th>
              </tr>
            </thead>
            <tbody>
              {onlyWithRework.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">ไม่มีงานถูกส่งกลับในช่วงเวลานี้ 🎉</td></tr>
              ) : onlyWithRework.map((s, i) => {
                const topCats = Object.entries(s.categories).sort((a, b) => b[1] - a[1]).slice(0, 3);
                return (
                  <tr key={s.email} className={`border-b ${i % 2 === 0 ? '' : 'bg-muted/10'} hover:bg-muted/20`}>
                    <td className="px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.department || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${s.rejected_count >= 5 ? 'text-red-600' : s.rejected_count >= 3 ? 'text-orange-600' : ''}`}>
                        {s.rejected_count}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${s.rework_weighted >= 5 ? 'text-red-600' : s.rework_weighted >= 3 ? 'text-orange-600' : ''}`}>
                        {s.rework_weighted.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-1">
                        {s.severity.critical > 0 && <Badge className={`${SEV_COLORS.critical} text-[9px] px-1.5`}>C:{s.severity.critical}</Badge>}
                        {s.severity.major > 0 && <Badge className={`${SEV_COLORS.major} text-[9px] px-1.5`}>M:{s.severity.major}</Badge>}
                        {s.severity.minor > 0 && <Badge className={`${SEV_COLORS.minor} text-[9px] px-1.5`}>m:{s.severity.minor}</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {topCats.map(([cat, cnt]) => (
                          <Badge key={cat} variant="secondary" className="text-[9px]">{cat} ({cnt})</Badge>
                        ))}
                        {topCats.length === 0 && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">{s.total_tasks}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Link
                        to={`/StaffScorecard?email=${encodeURIComponent(s.email)}`}
                        className="text-primary hover:underline text-[10px]"
                      >
                        ดู →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}