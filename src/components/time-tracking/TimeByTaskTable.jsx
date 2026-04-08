import React, { useMemo, useState, useEffect } from 'react';
import TablePagination, { paginateData } from '@/components/shared/TablePagination';
import { Badge } from '@/components/ui/badge';
import { useSortableTable } from '@/hooks/useSortableTable';
import SortableHeader from '@/components/shared/SortableHeader';

const SVC_LABELS = { accounting: 'บัญชี', payroll: 'เงินเดือน', tax_consulting: 'ภาษี', audit: 'ตรวจสอบ', peak_licensing: 'Peak' };

function formatHours(mins) {
  if (!mins) return '0';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m > 0 ? `${m} น.` : ''}`;
}

export default function TimeByTaskTable({ entries }) {
  const completed = entries.filter(e => !e.is_running && e.duration_minutes);

  const rows = useMemo(() => {
    const byTask = {};
    completed.forEach(e => {
      const key = e.task_id;
      if (!byTask[key]) byTask[key] = { title: e.task_title || 'Untitled', customer: e.customer_name || '', service: e.service_type || '', totalMinutes: 0, entryCount: 0 };
      byTask[key].totalMinutes += e.duration_minutes || 0;
      byTask[key].entryCount++;
    });
    return Object.entries(byTask).map(([id, data]) => ({ id, ...data }));
  }, [completed]);

    const { sorted, sortKey, sortDir, handleSort } = useSortableTable(rows, 'totalMinutes', 'desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { setPage(1); }, [entries]);

    if (rows.length === 0) return <div className="text-center py-6 text-muted-foreground text-sm">ไม่มีข้อมูล</div>;

  const paged = paginateData(sorted, page, pageSize);

  return (
    <div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="w-full text-left">
        <thead className="border-b bg-muted/30 sticky top-0 z-10">
          <tr>
            <SortableHeader label="Task" field="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader label="ลูกค้า" field="customer" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
            <SortableHeader label="บริการ" field="service" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
            <SortableHeader label="Entries" field="entryCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
            <SortableHeader label="เวลารวม" field="totalMinutes" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
          </tr>
        </thead>
        <tbody>
                    {paged.map((row, i) => (
            <tr key={row.id} className={`border-b last:border-b-0 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
              <td className="px-3 py-1.5 text-xs font-medium truncate max-w-[200px]">{row.title}</td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground truncate max-w-[120px] hidden md:table-cell">{row.customer || '-'}</td>
              <td className="px-3 py-1.5 hidden md:table-cell">
                {row.service && <Badge variant="secondary" className="text-[9px]">{SVC_LABELS[row.service] || row.service}</Badge>}
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground text-right">{row.entryCount}</td>
              <td className="px-3 py-1.5 text-right">
                <Badge variant="outline" className="text-[10px] font-mono">{formatHours(row.totalMinutes)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {sorted.length > pageSize && <TablePagination totalItems={sorted.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
    </div>
  );
}