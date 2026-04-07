import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default function TaxCalendarStats({ stats, t }) {
  const items = [
    { label: t('tax_cal_total'), value: stats.total, icon: CalendarDays, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: t('tax_cal_shifted'), value: stats.shifted, icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { label: t('tax_cal_upcoming'), value: stats.upcoming, icon: Clock, iconBg: 'bg-red-50', iconColor: 'text-red-600', valueColor: stats.upcoming > 0 ? 'text-red-600' : '' },
    { label: t('tax_cal_past'), value: stats.pastDue, icon: CheckCircle2, iconBg: 'bg-gray-50', iconColor: 'text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.iconColor}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${item.valueColor || ''}`}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}