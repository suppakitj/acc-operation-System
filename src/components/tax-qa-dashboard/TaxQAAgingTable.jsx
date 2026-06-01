import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

const PAGE_SIZE = 15;

const statusColors = {
  draft: 'bg-slate-100 text-slate-600',
  validating: 'bg-blue-100 text-blue-700',
  flagged: 'bg-red-100 text-red-700',
  clean: 'bg-green-100 text-green-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  filed: 'bg-purple-100 text-purple-700',
};

export default function TaxQAAgingTable({ filters }) {
  const [page, setPage] = useState(0);
  const { period, formFilter, statusFilter, customerSearch, preparedBySearch } = filters;

  const { data: filings = [] } = useQuery({
    queryKey: ['taxqa_aging', period],
    queryFn: () => base44.entities.TaxQA_Filing.filter({ tax_period: period }, '-created_date', 500),
  });

  const { data: deadlines = [] } = useQuery({
    queryKey: ['taxqa_deadlines', period],
    queryFn: () => {
      const [y, m] = period.split('-');
      return base44.entities.TaxDeadline.filter({ for_year: parseInt(y), for_month: parseInt(m) }, '-created_date', 50);
    },
  });

  const deadlineMap = useMemo(() => {
    const m = {};
    deadlines.forEach(d => { m[d.id] = d; });
    return m;
  }, [deadlines]);

  const filtered = useMemo(() => {
    let list = filings;
    if (formFilter !== 'all') list = list.filter(f => f.form_type === formFilter);
    if (statusFilter !== 'all') list = list.filter(f => f.status === statusFilter);
    if (customerSearch) list = list.filter(f => (f.customer_name || '').toLowerCase().includes(customerSearch.toLowerCase()));
    if (preparedBySearch) list = list.filter(f => (f.prepared_by_name || f.prepared_by || '').toLowerCase().includes(preparedBySearch.toLowerCase()));
    return list;
  }, [filings, formFilter, statusFilter, customerSearch, preparedBySearch]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">รายการ Filing ({filtered.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs">
              <th className="text-left py-2 px-2">ลูกค้า</th>
              <th className="text-left py-2 px-2">แบบ</th>
              <th className="text-left py-2 px-2">งวด</th>
              <th className="text-left py-2 px-2">สถานะ</th>
              <th className="text-right py-2 px-2">Flags</th>
              <th className="text-left py-2 px-2">Deadline</th>
              <th className="text-left py-2 px-2">Aging</th>
              <th className="text-left py-2 px-2">ผู้จัดทำ</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(f => {
              const dl = f.tax_deadline_id ? deadlineMap[f.tax_deadline_id] : null;
              const dlDate = dl?.deadline;
              const isOverdue = dlDate && dlDate < today && f.status !== 'filed';
              const isNear = dlDate && !isOverdue && dlDate <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) && f.status !== 'filed';

              return (
                <tr key={f.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 max-w-[180px] truncate">{f.customer_name}</td>
                  <td className="py-2 px-2">{f.form_type}</td>
                  <td className="py-2 px-2">{f.tax_period}</td>
                  <td className="py-2 px-2">
                    <Badge className={statusColors[f.status] || 'bg-slate-100'}>{f.status}</Badge>
                  </td>
                  <td className="py-2 px-2 text-right">{f.flag_count || 0}</td>
                  <td className="py-2 px-2">{dlDate || '-'}</td>
                  <td className="py-2 px-2">
                    {isOverdue && <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />เลยกำหนด</Badge>}
                    {isNear && <Badge className="bg-amber-100 text-amber-700">ใกล้กำหนด</Badge>}
                  </td>
                  <td className="py-2 px-2 max-w-[120px] truncate">{f.prepared_by_name || f.prepared_by || '-'}</td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">หน้า {page + 1}/{totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}