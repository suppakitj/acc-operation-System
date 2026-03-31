import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Users, Clock, Flame } from 'lucide-react';

export default function ForecastSummaryCards({ riskStats, workloadStats }) {
  const cards = [
    { label: 'งานเสี่ยง Overdue', value: riskStats.total, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', sub: `วิกฤต ${riskStats.critical} / สูง ${riskStats.high}` },
    { label: 'งาน Overdue แล้ว', value: riskStats.alreadyOverdue, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', sub: 'ยังไม่เสร็จ' },
    { label: 'พนักงาน Overload', value: workloadStats.overload, icon: Flame, color: 'text-red-600', bg: 'bg-red-50', sub: `ใกล้เต็ม ${workloadStats.nearFull}` },
    { label: 'พนักงานทั้งหมด (Active)', value: workloadStats.totalStaff, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: `avg ${workloadStats.avgTasks} งาน/คน` },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className="shadow-sm border">
          <CardContent className="p-3">
            <div className="flex items-start gap-2.5">
              <div className={`p-1.5 rounded-lg ${c.bg} mt-0.5`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground leading-tight">{c.label}</p>
                <p className="text-lg font-bold leading-tight mt-0.5">{c.value}</p>
                {c.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}