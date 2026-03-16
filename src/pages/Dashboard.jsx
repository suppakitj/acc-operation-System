import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckSquare, Building2, CreditCard, AlertTriangle, Users, Clock } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import TaskStatusChart from '../components/dashboard/TaskStatusChart';
import DueDateAlerts from '../components/dashboard/DueDateAlerts';
import RecentTasks from '../components/dashboard/RecentTasks';

export default function Dashboard() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: billings = [] } = useQuery({
    queryKey: ['billings'],
    queryFn: () => base44.entities.Billing.list('-created_date', 100),
  });

  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
    return new Date(t.due_date) < new Date();
  });
  const unpaidBillings = billings.filter(b => b.status === 'sent' || b.status === 'overdue');
  const totalRevenue = billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.total_amount || b.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">ภาพรวมระบบ ACC Consulting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="งานทั้งหมด" value={activeTasks.length} icon={CheckSquare} />
        <StatCard title="ลูกค้า" value={customers.length} icon={Building2} />
        <StatCard title="เกินกำหนด" value={overdueTasks.length} icon={AlertTriangle} />
        <StatCard title="ค้างชำระ" value={unpaidBillings.length} icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskStatusChart tasks={tasks} />
        <DueDateAlerts tasks={tasks} />
      </div>

      <RecentTasks tasks={tasks} />
    </div>
  );
}