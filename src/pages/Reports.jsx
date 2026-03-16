import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const SERVICE_LABELS = {
  accounting: 'ทำบัญชี', payroll: 'เงินเดือน', tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบบัญชี', peak_licensing: 'Peak Account'
};

const COLORS = ['#1e3a5f', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'];

export default function Reports() {
  const [period, setPeriod] = useState('all');

  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 500) });
  const { data: billings = [] } = useQuery({ queryKey: ['billings'], queryFn: () => base44.entities.Billing.list('-created_date', 500) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });

  // Tasks by service
  const tasksByService = {};
  tasks.forEach(t => {
    const key = t.service_type || 'other';
    tasksByService[key] = (tasksByService[key] || 0) + 1;
  });
  const taskServiceData = Object.entries(tasksByService).map(([k, v]) => ({ name: SERVICE_LABELS[k] || k, value: v }));

  // Tasks by department
  const tasksByDept = {};
  tasks.forEach(t => {
    const key = t.department || 'other';
    tasksByDept[key] = (tasksByDept[key] || 0) + 1;
  });
  const deptData = Object.entries(tasksByDept).map(([k, v]) => ({ name: k, value: v }));

  // Revenue by service
  const revenueByService = {};
  billings.filter(b => b.status === 'paid').forEach(b => {
    const key = b.service_type || 'other';
    revenueByService[key] = (revenueByService[key] || 0) + (b.total_amount || b.amount || 0);
  });
  const revenueData = Object.entries(revenueByService).map(([k, v]) => ({ name: SERVICE_LABELS[k] || k, value: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">Dashboard & Reporting</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center"><p className="text-2xl font-bold">{tasks.length}</p><p className="text-xs text-muted-foreground">งานทั้งหมด</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold">{customers.length}</p><p className="text-xs text-muted-foreground">ลูกค้า</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-green-600">฿{billings.filter(b => b.status === 'paid').reduce((s, b) => s + (b.total_amount || b.amount || 0), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">รายได้รวม</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">งานตามบริการ</CardTitle></CardHeader>
          <CardContent>
            {taskServiceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskServiceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">ไม่มีข้อมูล</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">รายได้ตามบริการ</CardTitle></CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={revenueData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                    {revenueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `฿${v.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">ไม่มีข้อมูล</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}