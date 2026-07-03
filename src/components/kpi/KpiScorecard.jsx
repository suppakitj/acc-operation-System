import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, CalendarClock, Users, Repeat, ArrowUp, ArrowDown, Minus } from 'lucide-react';

function fmt(n, decimals = 1) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: decimals });
}

function Delta({ current, previous }) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" /> เท่าเดิม</span>;
  const isUp = diff > 0;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
      {isUp ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {fmt(Math.abs(diff))}% vs เดือนก่อน
    </span>
  );
}

function DeltaInverse({ current, previous }) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" /> เท่าเดิม</span>;
  const isUp = diff > 0;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${isUp ? 'text-red-600' : 'text-green-600'}`}>
      {isUp ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {fmt(Math.abs(diff))}% vs เดือนก่อน
    </span>
  );
}

function DeltaDays({ current, previous }) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" /> เท่าเดิม</span>;
  const isUp = diff > 0;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${isUp ? 'text-red-600' : 'text-green-600'}`}>
      {isUp ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {fmt(Math.abs(diff))} วัน vs เดือนก่อน
    </span>
  );
}

export default function KpiScorecard({ kpi, prevKpi }) {
  const cards = [
    {
      label: 'On-Time Rate', value: `${fmt(kpi.onTimeRate)}%`, icon: CheckCircle2,
      color: kpi.onTimeRate >= 90 ? 'text-green-600' : kpi.onTimeRate >= 75 ? 'text-yellow-600' : 'text-red-600',
      bg: kpi.onTimeRate >= 90 ? 'bg-green-50' : kpi.onTimeRate >= 75 ? 'bg-yellow-50' : 'bg-red-50',
      delta: <Delta current={kpi.onTimeRate} previous={prevKpi?.onTimeRate} />,
    },
    {
      label: 'งานที่เสร็จแล้ว', value: `${kpi.completedCount} งาน`, icon: CheckCircle2,
      sub: `จากทั้งหมด ${kpi.totalInPeriod} งาน`, color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      label: 'งาน Overdue', value: `${kpi.overdueCount} งาน`, icon: AlertTriangle,
      sub: kpi.overdueOver3 > 0 ? `เกินกำหนด > 3 วัน: ${kpi.overdueOver3}` : '',
      color: 'text-red-600', bg: 'bg-red-50',
    },
    {
      label: 'งาน Urgent/High Pending', value: `${kpi.urgentHighPending} งาน`, icon: Clock,
      sub: 'priority สูงที่ยังไม่เสร็จ', color: 'text-orange-600', bg: 'bg-orange-50',
    },
    {
      label: 'Avg Completion Time', value: `${fmt(kpi.avgCompletionDays)} วัน`, icon: CalendarClock,
      color: 'text-purple-600', bg: 'bg-purple-50',
      delta: <DeltaDays current={kpi.avgCompletionDays} previous={prevKpi?.avgCompletionDays} />,
    },
    {
      label: 'Due Date Change Rate', value: `${fmt(kpi.dueDateChangeRate)}%`, icon: Repeat,
      sub: `${kpi.dueDateChangedCount}/${kpi.totalInPeriod} งานถูกเลื่อน`, color: 'text-amber-600', bg: 'bg-amber-50',
      delta: <DeltaInverse current={kpi.dueDateChangeRate} previous={prevKpi?.dueDateChangeRate} />,
    },
    {
      label: 'Staff Utilization', value: `${fmt(kpi.utilization)}%`, icon: Users,
      sub: `${fmt(kpi.totalLoggedHours, 0)} ชม. จาก capacity`, color: 'text-indigo-600', bg: 'bg-indigo-50',
      delta: <Delta current={kpi.utilization} previous={prevKpi?.utilization} />,
    },
    {
      label: 'Recurring Task Completion', value: `${fmt(kpi.recurringCompletionRate)}%`, icon: TrendingUp,
      sub: `${kpi.recurringCompleted}/${kpi.recurringTotal} งานประจำ`, color: 'text-teal-600', bg: 'bg-teal-50',
    },
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
                {c.delta && <div className="mt-0.5">{c.delta}</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}