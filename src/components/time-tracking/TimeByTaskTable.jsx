import React from 'react';
import { Badge } from '@/components/ui/badge';

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

  const byTask = {};
  completed.forEach(e => {
    const key = e.task_id;
    if (!byTask[key]) byTask[key] = { title: e.task_title || 'Untitled', customer: e.customer_name || '', service: e.service_type || '', totalMinutes: 0, entryCount: 0 };
    byTask[key].totalMinutes += e.duration_minutes || 0;
    byTask[key].entryCount++;
  });

  const rows = Object.entries(byTask)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  if (rows.length === 0) return <div className="text-center py-6 text-muted-foreground text-sm">ไม่มีข้อมูล</div>;

  return (
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="w-full text-left">
        <thead className="border-b bg-muted/30 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Task</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">ลูกค้า</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">บริการ</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-right">Entries</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-right">เวลารวม</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
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
  );
}