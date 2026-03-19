import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { useLanguage } from '../LanguageContext';

const STATUS_BADGE = {
  pending: { label: 'Not Started', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  review: { label: 'Waiting', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

export default function DueIn7Days({ tasks }) {
  const { t } = useLanguage();
  const today = new Date();

  const upcoming = tasks
    .filter(task => {
      if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
      const days = differenceInDays(new Date(task.due_date), today);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Clock className="w-4 h-4 text-yellow-500" />
        <CardTitle className="text-sm md:text-base font-semibold">Due in 7 Days</CardTitle>
        <span className="text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-medium">{upcoming.length}</span>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[320px] space-y-0">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('no_alerts')}</p>
        ) : (
          upcoming.slice(0, 8).map(task => {
            const badge = STATUS_BADGE[task.status] || STATUS_BADGE.pending;
            const daysLeft = differenceInDays(new Date(task.due_date), today);
            return (
              <div key={task.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.customer_name || '-'} · {task.assigned_name || '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-yellow-600">{daysLeft === 0 ? 'วันนี้' : `อีก ${daysLeft} วัน`}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(task.due_date), 'd MMM')}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}