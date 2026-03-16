import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../LanguageContext';

export default function TodaySchedule({ schedules }) {
  const { t } = useLanguage();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaySchedules = schedules.filter(s => s.date === todayStr);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm md:text-base font-semibold">Today's Movements</CardTitle>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{todaySchedules.length}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[320px]">
        {todaySchedules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">{t('no_schedule')}</p>
        ) : (
          <div className="space-y-2">
            {todaySchedules.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.start_time || ''}{s.end_time ? ` - ${s.end_time}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}