import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PostponeByStaffTable({ staffStats }) {
  const [sortField, setSortField] = useState('total_postpones');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = [...staffStats].sort((a, b) => {
    const va = a[sortField] || 0;
    const vb = b[sortField] || 0;
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortHeader = ({ field, children, className = '' }) => (
    <th className={`px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => handleSort(field)}>
      {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-600" />
          การเลื่อนแยกตาม Staff
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Staff</th>
                <SortHeader field="total_tasks">งานทั้งหมด</SortHeader>
                <SortHeader field="postponed_tasks">งานที่เลื่อน</SortHeader>
                <SortHeader field="postpone_rate">อัตราเลื่อน</SortHeader>
                <SortHeader field="total_postpones">ครั้งที่เลื่อน</SortHeader>
                <SortHeader field="avg_slippage">เฉลี่ย (วัน)</SortHeader>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase">เหตุผลบ่อยสุด</th>
              </tr>
            </thead>
            <tbody>
              {sorted.filter(s => s.total_postpones > 0).map(s => {
                const topReason = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
                const rate = (s.postpone_rate * 100).toFixed(0);
                return (
                  <tr key={s.email} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <Link to={`/StaffScorecard?email=${encodeURIComponent(s.email)}`} className="text-xs font-semibold text-primary hover:underline">
                        {s.name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">{s.department}</p>
                    </td>
                    <td className="px-2 py-2 text-xs text-center">{s.total_tasks}</td>
                    <td className="px-2 py-2 text-xs text-center">{s.postponed_tasks}</td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant="outline" className={`text-[10px] ${Number(rate) >= 30 ? 'bg-red-50 text-red-700 border-red-300' : Number(rate) >= 15 ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                        {rate}%
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-xs text-center font-semibold">{s.total_postpones}</td>
                    <td className="px-2 py-2 text-xs text-center">{s.avg_slippage} วัน</td>
                    <td className="px-2 py-2 text-[10px] text-muted-foreground max-w-[180px] truncate">
                      {topReason ? `${topReason[0]} (${topReason[1]}x)` : '-'}
                    </td>
                  </tr>
                );
              })}
              {sorted.filter(s => s.total_postpones > 0).length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-xs text-muted-foreground">ไม่มีข้อมูลการเลื่อนในช่วงนี้</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}