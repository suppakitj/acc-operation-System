import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const STATUS_COLORS = {
  pending: '#94a3b8',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังทำ',
  review: 'รอตรวจสอบ',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

export default function TaskStatusChart({ tasks }) {
  const statusCounts = {};
  tasks.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#94a3b8',
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">สถานะงาน</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">ไม่มีข้อมูล</div>
        )}
      </CardContent>
    </Card>
  );
}