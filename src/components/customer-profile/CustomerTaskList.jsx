import React, { useState, useEffect } from 'react';
import TablePagination, { paginateData } from '@/components/shared/TablePagination';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const STATUS_MAP = {
  pending: { label: 'รอดำเนินการ', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'กำลังทำ', color: 'bg-blue-100 text-blue-700' },
  review: { label: 'รอตรวจ', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'เสร็จแล้ว', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700' },
};

const PRIORITY_MAP = {
  low: { label: 'ต่ำ', color: 'bg-blue-50 text-blue-600' },
  medium: { label: 'ปกติ', color: 'bg-yellow-50 text-yellow-600' },
  high: { label: 'สูง', color: 'bg-orange-50 text-orange-600' },
  urgent: { label: 'ด่วน', color: 'bg-red-50 text-red-600' },
};

const SERVICE_MAP = {
  accounting: 'ทำบัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบ',
  peak_licensing: 'Peak',
};

export default function CustomerTaskList({ tasks }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [tasks]);

    const pagedTasks = paginateData(tasks, page, pageSize);

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล Task</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">งาน</th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground hidden sm:table-cell">บริการ</th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">ผู้รับผิดชอบ</th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground hidden md:table-cell">กำหนดส่ง</th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">สถานะ</th>
            <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground hidden lg:table-cell">ความสำคัญ</th>
          </tr>
        </thead>
        <tbody>
                    {pagedTasks.map(task => {
            const st = STATUS_MAP[task.status] || { label: task.status, color: 'bg-muted' };
            const pr = PRIORITY_MAP[task.priority] || {};
            const isOverdue = task.due_date && task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.due_date) < new Date();
            return (
              <tr key={task.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5">
                  <p className="text-xs font-medium truncate max-w-[200px]">{task.title}</p>
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  <span className="text-[11px] text-muted-foreground">{SERVICE_MAP[task.service_type] || task.service_type || '-'}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[11px] text-muted-foreground">{task.assigned_name || task.assigned_to?.split('@')[0] || '-'}</span>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className={`text-[11px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {task.due_date ? format(new Date(task.due_date), 'd MMM yy', { locale: th }) : '-'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="secondary" className={`text-[9px] ${st.color}`}>{st.label}</Badge>
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  {pr.label && <Badge variant="secondary" className={`text-[9px] ${pr.color}`}>{pr.label}</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
              </table>
      </div>
      {tasks.length > pageSize && <TablePagination totalItems={tasks.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
  );
}