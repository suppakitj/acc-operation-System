import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';

export default function ReworkSummaryCards({ tasks, rejections, staffStats }) {
  const totalTasks = tasks.length;
  const totalRejections = rejections.length;
  const tasksWithRework = new Set(rejections.map(r => r.task_id)).size;
  const reworkRate = totalTasks > 0 ? (tasksWithRework / totalTasks * 100).toFixed(1) : '0.0';

  const sevMinor = rejections.filter(r => r.severity === 'minor').length;
  const sevMajor = rejections.filter(r => r.severity === 'major').length;
  const sevCritical = rejections.filter(r => r.severity === 'critical').length;

  const totalFTR = staffStats.reduce((s, st) => s + st.first_time_right, 0);
  const totalCompleted = staffStats.reduce((s, st) => s + st.completed, 0);
  const ftrRate = totalCompleted > 0 ? (totalFTR / totalCompleted * 100).toFixed(1) : '100';

  const cards = [
    { label: 'ส่งกลับทั้งหมด', value: totalRejections, sub: `จาก ${tasksWithRework} งาน`, icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Rework Rate', value: `${reworkRate}%`, sub: `${tasksWithRework} / ${totalTasks} งาน`, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'First Time Right', value: `${ftrRate}%`, sub: `${totalFTR} / ${totalCompleted} งานเสร็จ`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Critical', value: sevCritical, sub: `Major ${sevMajor} · Minor ${sevMinor}`, icon: AlertTriangle, color: sevCritical > 0 ? 'text-red-600' : 'text-emerald-600', bg: sevCritical > 0 ? 'bg-red-50' : 'bg-emerald-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}