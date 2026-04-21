import React, { useMemo } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Timer, Flame, TrendingUp, ChevronRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { Link } from 'react-router-dom';

export default function MyStats({ myTasks, myTimeEntries, currentUser }) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // Completed this month
    const completedThisMonth = myTasks.filter(task =>
      task.status === 'completed' &&
      task.completed_date &&
      new Date(task.completed_date) >= monthStart &&
      new Date(task.completed_date) <= monthEnd
    );

    // On-time rate (use original_due_date for 3E accuracy)
    const onTime = completedThisMonth.filter(task => {
      const baseline = task.original_due_date || task.due_date;
      return task.completed_date && baseline &&
        task.completed_date.slice(0, 10) <= baseline.slice(0, 10);
    });
    const onTimeRate = completedThisMonth.length > 0
      ? Math.round((onTime.length / completedThisMonth.length) * 100)
      : 100;

    // Hours this month
    const hoursThisMonth = myTimeEntries
      .filter(e => !e.is_running && e.duration_minutes && new Date(e.start_time) >= monthStart)
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const totalHours = Math.round(hoursThisMonth / 60 * 10) / 10;

    // Streak
    const sortedCompleted = myTasks
      .filter(task => task.status === 'completed' && task.completed_date && task.due_date)
      .sort((a, b) => (b.completed_date || '').localeCompare(a.completed_date || ''));
    let streak = 0;
    for (const task of sortedCompleted) {
      const baseline = task.original_due_date || task.due_date;
      if (baseline && task.completed_date.slice(0, 10) <= baseline.slice(0, 10)) {
        streak++;
      } else {
        break;
      }
    }

    return { completedCount: completedThisMonth.length, onTimeRate, totalHours, streak };
  }, [myTasks, myTimeEntries]);

  const onTimeColor = stats.onTimeRate >= 80 ? 'text-green-600' : stats.onTimeRate >= 60 ? 'text-yellow-600' : 'text-red-600';

  const cards = [
    { label: t('my_day_completed'), value: stats.completedCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('my_day_ontime'), value: `${stats.onTimeRate}%`, icon: TrendingUp, color: onTimeColor, bg: stats.onTimeRate >= 80 ? 'bg-green-50' : stats.onTimeRate >= 60 ? 'bg-yellow-50' : 'bg-red-50' },
    { label: t('my_day_hours'), value: `${stats.totalHours} ชม.`, icon: Timer, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('my_day_streak'), value: `${stats.streak} งาน${stats.streak >= 5 ? ' 🔥' : ''}`, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t('my_day_stats')}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="shadow-sm border">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {currentUser?.email && (
        <Link
          to={`/StaffScorecard?email=${encodeURIComponent(currentUser.email)}`}
          className="flex items-center justify-end gap-1 text-xs text-primary hover:underline mt-1"
        >
          ดู Performance Scorecard ของฉัน <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}