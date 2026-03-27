import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '../shared/StatusBadge';
import { useLanguage } from '../LanguageContext';
import { parseUTCDate } from '@/lib/dateUtils';

export default function RecentTasks({ tasks }) {
  const { t } = useLanguage();
  const recent = tasks
    .sort((a, b) => parseUTCDate(b.updated_date || b.created_date) - parseUTCDate(a.updated_date || a.created_date))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{t('recent_tasks')}</CardTitle></CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('no_data')}</p>
        ) : (
          <div className="space-y-2">
            {recent.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.customer_name || '-'} · {task.assigned_name || '-'}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}