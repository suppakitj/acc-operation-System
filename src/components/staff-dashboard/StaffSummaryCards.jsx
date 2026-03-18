import React from 'react';
import { Users, ClipboardList, AlertTriangle, CheckCircle2 } from 'lucide-react';

const cards = [
  { key: 'staff', label: 'พนักงาน', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'pending', label: 'งานค้างทั้งหมด', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'overdue', label: 'เกินกำหนด', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'completedMonth', label: 'เสร็จเดือนนี้', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
];

export default function StaffSummaryCards({ staffCount, totalPending, totalOverdue, totalCompletedMonth }) {
  const values = { staff: staffCount, pending: totalPending, overdue: totalOverdue, completedMonth: totalCompletedMonth };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div key={c.key} className="bg-card rounded-lg border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{values[c.key]}</p>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}