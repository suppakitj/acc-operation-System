import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';

export default function DueDateAlerts({ tasks }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alerts = tasks
    .filter(t => t.due_date && t.status !== 'completed' && t.status !== 'cancelled')
    .map(t => {
      const dueDate = parseISO(t.due_date);
      if (!isValid(dueDate)) return null;
      const diff = differenceInDays(dueDate, today);
      let type = null;
      if (diff < 0) type = 'overdue';
      else if (diff <= 3) type = 'due_3days';
      else if (diff <= 7) type = 'due_7days';
      return type ? { ...t, alertType: type, daysLeft: diff } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const alertConfig = {
    overdue: { label: 'เกินกำหนด', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    due_3days: { label: 'อีก 3 วัน', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
    due_7days: { label: 'อีก 7 วัน', color: 'bg-blue-100 text-blue-700', icon: Clock },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          การแจ้งเตือน Due Date
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีงานใกล้กำหนด</p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {alerts.slice(0, 10).map(alert => {
              const config = alertConfig[alert.alertType];
              const IconComp = config.icon;
              return (
                <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <IconComp className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.customer_name}</p>
                  </div>
                  <Badge variant="secondary" className={config.color}>
                    {alert.alertType === 'overdue' ? `เกิน ${Math.abs(alert.daysLeft)} วัน` : config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}