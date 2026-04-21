import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export default function PostponeByCustomerTable({ customerStats }) {
  if (customerStats.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          การเลื่อนแยกตามลูกค้า
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">ลูกค้า</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">งานทั้งหมด</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">งานที่เลื่อน</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center">ครั้งที่เลื่อน</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase">เหตุผลบ่อยสุด</th>
              </tr>
            </thead>
            <tbody>
              {customerStats.slice(0, 20).map(s => {
                const topReason = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
                const rate = s.total_tasks > 0 ? ((s.postponed_tasks / s.total_tasks) * 100).toFixed(0) : '0';
                return (
                  <tr key={s.customer_id} className="border-b hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <p className="text-xs font-semibold">{s.customer_name}</p>
                    </td>
                    <td className="px-2 py-2 text-xs text-center">{s.total_tasks}</td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant="outline" className={`text-[10px] ${Number(rate) >= 30 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                        {s.postponed_tasks} ({rate}%)
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-xs text-center font-semibold">{s.total_postpones}</td>
                    <td className="px-2 py-2 text-[10px] text-muted-foreground max-w-[200px] truncate">
                      {topReason ? `${topReason[0]} (${topReason[1]}x)` : '-'}
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