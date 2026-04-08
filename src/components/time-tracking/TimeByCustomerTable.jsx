import React, { useState, useEffect } from 'react';
import TablePagination, { paginateData } from '@/components/shared/TablePagination';
import { Badge } from '@/components/ui/badge';

function formatHours(mins) {
  if (!mins) return '0';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m > 0 ? `${m} น.` : ''}`;
}

export default function TimeByCustomerTable({ entries }) {
  const completed = entries.filter(e => !e.is_running && e.duration_minutes);

  // Group by customer
  const byCustomer = {};
  completed.forEach(e => {
    const key = e.customer_id || '_none';
    if (!byCustomer[key]) byCustomer[key] = { name: e.customer_name || 'ไม่ระบุลูกค้า', totalMinutes: 0, taskCount: new Set(), entryCount: 0 };
    byCustomer[key].totalMinutes += e.duration_minutes || 0;
    byCustomer[key].taskCount.add(e.task_id);
    byCustomer[key].entryCount++;
  });

    const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { setPage(1); }, [entries]);

  const rows = Object.entries(byCustomer)
    .map(([id, data]) => ({ id, ...data, taskCount: data.taskCount.size }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const maxMinutes = rows.length > 0 ? rows[0].totalMinutes : 1;

    if (rows.length === 0) return <div className="text-center py-6 text-muted-foreground text-sm">ไม่มีข้อมูล</div>;

  const pagedRows = paginateData(rows, page, pageSize);

  return (
    <div className="space-y-2">
      {pagedRows.map(row => (
        <div key={row.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{row.name}</p>
            <p className="text-[10px] text-muted-foreground">{row.taskCount} tasks · {row.entryCount} entries</p>
          </div>
          <div className="w-24 md:w-40 hidden sm:block">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(row.totalMinutes / maxMinutes) * 100}%` }} />
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">{formatHours(row.totalMinutes)}</Badge>
        </div>
      ))}
      {rows.length > pageSize && <TablePagination totalItems={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    </div>
  );
}