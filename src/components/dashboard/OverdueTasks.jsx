import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

export default function OverdueTasks({ tasks }) {
  const { t } = useLanguage();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = tasks
    .filter(task => {
      if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
      return new Date(task.due_date) < todayStart;
    })
    .map(task => ({
      ...task,
      daysLate: differenceInDays(todayStart, new Date(task.due_date)),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <CardTitle className="text-sm md:text-base font-semibold">Overdue Tasks</CardTitle>
          <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">{overdue.length}</span>
        </div>
        <Link to="/Tasks" className="text-xs text-primary hover:underline">View all →</Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[320px] space-y-0">
        {overdue.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('no_data')}</p>
        ) : (
          overdue.slice(0, 8).map(task => (
            <div key={task.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
              <div className="w-1 h-10 bg-red-400 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground truncate">{task.customer_name || '-'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-red-600">{task.daysLate}d late</p>
                <p className="text-[11px] text-muted-foreground">{task.assigned_name || '-'}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}