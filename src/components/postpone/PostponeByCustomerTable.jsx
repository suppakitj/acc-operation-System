import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 10;

export default function PostponeByCustomerTable({ customerStats }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customerStats;
    const q = search.toLowerCase();
    return customerStats.filter(s => s.customer_name?.toLowerCase().includes(q));
  }, [customerStats, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when search changes
  React.useEffect(() => { setPage(1); }, [search]);

  if (customerStats.length === 0) return null;

  const maxPostpones = Math.max(...customerStats.map(s => s.total_postpones), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            การเลื่อนแยกตามลูกค้า
            <Badge variant="secondary" className="text-[10px] font-normal">{customerStats.length} ราย</Badge>
          </CardTitle>
          <div className="relative w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาลูกค้า..."
              className="h-7 text-xs pl-7 pr-2"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-y bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">ลูกค้า</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center w-20">งานทั้งหมด</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center w-28">งานที่เลื่อน</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center w-32">ครั้งที่เลื่อน</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase w-40">เหตุผลบ่อยสุด</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(s => {
                const topReason = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
                const rate = s.total_tasks > 0 ? ((s.postponed_tasks / s.total_tasks) * 100) : 0;
                const barWidth = Math.max(4, (s.total_postpones / maxPostpones) * 100);
                const rateColor = rate >= 50 ? 'bg-red-100 text-red-700 border-red-300' :
                                  rate >= 25 ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                  'bg-green-100 text-green-700 border-green-300';
                const barColor = rate >= 50 ? 'bg-red-400' : rate >= 25 ? 'bg-amber-400' : 'bg-emerald-400';

                return (
                  <tr key={s.customer_id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2">
                      <p className="text-xs font-semibold truncate max-w-[220px]">{s.customer_name}</p>
                    </td>
                    <td className="px-2 py-2 text-xs text-center text-muted-foreground">{s.total_tasks}</td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant="outline" className={`text-[10px] ${rateColor}`}>
                        {s.postponed_tasks} ({rate.toFixed(0)}%)
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-6 text-right">{s.total_postpones}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-[10px] text-muted-foreground truncate max-w-[160px]">
                      {topReason ? `${topReason[0]} (${topReason[1]}x)` : '-'}
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-xs text-muted-foreground">ไม่พบข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
            <span className="text-[10px] text-muted-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground px-1">{safePage}/{totalPages}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}