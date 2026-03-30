import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ClipboardList, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { parseUTCDate } from '@/lib/dateUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserList } from '@/hooks/useUserList';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import CompletionRateDonut from '../components/dashboard/CompletionRateDonut';
import OverdueTrendChart from '../components/dashboard/OverdueTrendChart';
import TopPerformersMonthly from '../components/dashboard/TopPerformersMonthly';
import RecentActivity from '../components/dashboard/RecentActivity';
import TaskDistributionPie from '../components/dashboard/TaskDistributionPie';
import TaskStatusByDept from '../components/dashboard/TaskStatusByDept';
import OverdueByPerson from '../components/dashboard/OverdueByPerson';

const DEPT_LABELS = {
  management: 'Management',
  accounting: 'Accounting',
  consulting: 'Consulting',
  audit: 'Audit',
  billing: 'Billing',
  it: 'IT',
};

export default function Dashboard() {
  const today = new Date();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
    staleTime: 60_000,
  });
  const { data: users = [] } = useUserList();

  const [deptFilter, setDeptFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (deptFilter !== 'all' && t.department !== deptFilter) return false;
      if (dateRange === 'this_month') {
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        const created = parseUTCDate(t.created_date);
        if (t.status === 'completed' || t.status === 'cancelled') {
          if (created < start || created > end) return false;
        }
      }
      return true;
    });
  }, [tasks, deptFilter, dateRange]);

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const activeTasks = filteredTasks.filter(t => t.status !== 'cancelled');
  const totalActive = activeTasks.length;
  const inProgress = activeTasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'review').length;
  const overdue = activeTasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date) < todayStart;
  }).length;
  const completed = activeTasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">ภาพรวมงานทั้งหมด — {format(today, 'd MMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="แผนก" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกแผนก</SelectItem>
              {Object.entries(DEPT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">เดือนนี้</SelectItem>
              <SelectItem value="all_time">ทั้งหมด</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat Cards — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard title="งานทั้งหมด" value={totalActive} icon={ClipboardList} variant="blue" />
        <DashboardStatCard title="กำลังดำเนินการ" value={inProgress} icon={Clock} variant="yellow" />
        <DashboardStatCard title="เกินกำหนด" value={overdue} icon={AlertTriangle} variant="red" />
        <DashboardStatCard title="เสร็จแล้ว" value={completed} icon={CheckCircle} variant="green" />
      </div>

      {/* Row 1 — Completion Rate + Overdue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompletionRateDonut tasks={filteredTasks} />
        <OverdueTrendChart tasks={filteredTasks} />
      </div>

      {/* Row 2 — Task Status by Department */}
      <TaskStatusByDept tasks={filteredTasks} />

      {/* Row 3 — Tasks by Service + Overdue by Person */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskDistributionPie tasks={filteredTasks} />
        <OverdueByPerson tasks={filteredTasks} users={users} />
      </div>

      {/* Row 4 — Top Performers + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopPerformersMonthly tasks={tasks} />
        <RecentActivity tasks={filteredTasks} />
      </div>
    </div>
  );
}