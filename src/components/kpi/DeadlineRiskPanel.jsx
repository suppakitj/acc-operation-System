import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';

const PRIORITY_STYLES = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function DeadlineRiskPanel({ atRiskTasks }) {
  const today = new Date();

  return (
    <Card className="shadow-sm border h-full">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Deadline Risk (7 วันข้างหน้า)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-4 px-5">
        {atRiskTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">ไม่มีงานเสี่ยงเกินกำหนด 🎉</p>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {atRiskTasks.slice(0, 15).map(task => {
              const daysLeft = differenceInDays(new Date(task.due_date), today);
              return (
                <div key={task.id} className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-tight flex-1">{task.title}</p>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${PRIORITY_STYLES[task.priority] || ''}`}>
                      {(task.priority || '').toUpperCase()}
                    </Badge>
                  </div>
                  {task.customer_name && <p className="text-[10px] text-muted-foreground">🏢 {task.customer_name}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>📅 {format(new Date(task.due_date), 'd MMM', { locale: th })}</span>
                    <span className={daysLeft <= 2 ? 'text-red-600 font-medium' : 'text-amber-600'}>
                      {daysLeft === 0 ? 'วันนี้!' : daysLeft === 1 ? 'พรุ่งนี้' : `อีก ${daysLeft} วัน`}
                    </span>
                    {task.assigned_name && <span>👤 {task.assigned_name}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}