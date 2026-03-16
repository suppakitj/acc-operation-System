import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const STATUS_LABELS = {
  pending: 'รอดำเนินการ', in_progress: 'กำลังทำ', review: 'รอตรวจสอบ',
  completed: 'เสร็จแล้ว', cancelled: 'ยกเลิก'
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600'
};

export default function RecentTasks({ tasks }) {
  const recent = tasks
    .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">งานล่าสุด</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-3">
            {recent.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.customer_name || '-'} · {task.assigned_name || '-'}</p>
                </div>
                <Badge variant="secondary" className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}