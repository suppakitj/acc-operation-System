import React from 'react';
import { Badge } from '@/components/ui/badge';

const SERVICE_LABELS = { accounting: 'ทำบัญชี', payroll: 'เงินเดือน', tax_consulting: 'ที่ปรึกษาภาษี', audit: 'ตรวจสอบ', peak_licensing: 'Peak' };
const PRIORITY_COLORS = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };

export default function GenerationPreviewTable({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">ไม่มี task ที่จะสร้าง</div>;
  }

  return (
    <div className="bg-card rounded-lg border overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="w-full text-left">
        <thead className="border-b bg-muted/30 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">ชื่องาน</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">ลูกค้า</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">บริการ</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">ผู้รับผิดชอบ</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Due Date</th>
            <th className="px-3 py-2 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Priority</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <tr key={i} className={`border-b last:border-b-0 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-1.5 text-xs font-medium truncate max-w-[200px]">{task.title}</td>
              <td className="px-3 py-1.5 text-xs truncate max-w-[150px]">{task.customer_name}</td>
              <td className="px-3 py-1.5 hidden md:table-cell">
                <Badge variant="secondary" className="text-[9px] px-1.5">{SERVICE_LABELS[task.service_type] || task.service_type}</Badge>
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground truncate max-w-[120px] hidden md:table-cell">
                {task.assigned_name || task.assigned_to || '-'}
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground hidden lg:table-cell">{task.due_date}</td>
              <td className="px-3 py-1.5 hidden lg:table-cell">
                <Badge variant="secondary" className={`text-[9px] px-1.5 ${PRIORITY_COLORS[task.priority] || ''}`}>
                  {task.priority}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}