import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, AlertTriangle, ClipboardList } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const STATUS_BADGES = {
  pending: 'bg-slate-50 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
};

function TaskCard({ task, onStatusChange, t }) {
  const nextAction = {
    pending: { label: t('my_day_start_work'), status: 'in_progress', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    in_progress: { label: t('my_day_send_review'), status: 'review', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
    review: { label: t('my_day_mark_done'), status: 'completed', color: 'bg-green-600 hover:bg-green-700 text-white' },
  }[task.status];

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{task.title}</p>
        {task.customer_name && (
          <p className="text-xs text-muted-foreground truncate">{task.customer_name}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGES[task.status] || ''}`}>
            {task.status === 'pending' ? 'รอดำเนินการ' : task.status === 'in_progress' ? 'กำลังทำ' : 'รอตรวจสอบ'}
          </Badge>
          {(task.priority === 'urgent' || task.priority === 'high') && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
              {task.priority === 'urgent' ? 'เร่งด่วน' : 'สูง'}
            </Badge>
          )}
        </div>
      </div>
      {nextAction && (
        <Button
          size="sm"
          className={`shrink-0 text-xs h-8 ${nextAction.color}`}
          onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, nextAction.status); }}
        >
          {nextAction.label}
        </Button>
      )}
    </div>
  );
}

export default function TodayFocus({ activeTasks, dueToday, overdue, onStatusChange }) {
  const { t } = useLanguage();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const statCards = [
    { label: t('my_day_today_focus'), value: dueToday.length, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('my_day_overdue'), value: overdue.length, icon: AlertTriangle, color: overdue.length > 0 ? 'text-red-600' : 'text-muted-foreground', bg: overdue.length > 0 ? 'bg-red-50' : 'bg-muted' },
    { label: 'งานทั้งหมด', value: activeTasks.length, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((s, i) => (
          <Card key={i} className="shadow-sm border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue section */}
      {overdue.length > 0 && (
        <div className="border-l-4 border-red-500 rounded-lg bg-red-50/50 p-4 space-y-2">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> {t('my_day_overdue')} ({overdue.length})
          </p>
          <div className="space-y-2">
            {overdue.map(task => {
              const days = differenceInDays(new Date(), new Date(task.due_date));
              return (
                <div key={task.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-red-200 bg-white">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className="text-[11px] text-red-600">{t('my_day_overdue_days', { n: days })}</p>
                  </div>
                  {task.status === 'pending' && (
                    <Button size="sm" className="shrink-0 text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => onStatusChange(task.id, 'in_progress')}>
                      {t('my_day_start_work')}
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button size="sm" className="shrink-0 text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => onStatusChange(task.id, 'review')}>
                      {t('my_day_send_review')}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's tasks */}
      {dueToday.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t('my_day_today_focus')} ({dueToday.length})</p>
          {dueToday.map(task => (
            <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} t={t} />
          ))}
        </div>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="p-8 text-center">
            <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t('my_day_no_tasks')} 🎉</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}