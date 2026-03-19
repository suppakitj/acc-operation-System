import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { ClipboardList, AlertTriangle, Clock, FileCheck, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import CompletionRateDonut from '../components/dashboard/CompletionRateDonut';
import OverdueTrendChart from '../components/dashboard/OverdueTrendChart';
import EmployeeProductivity from '../components/dashboard/EmployeeProductivity';
import TopPerformers from '../components/dashboard/TopPerformers';
import AtRiskEmployees from '../components/dashboard/AtRiskEmployees';
import RecentActivity from '../components/dashboard/RecentActivity';
import TaskDistributionPie from '../components/dashboard/TaskDistributionPie';
import WorkloadByTeam from '../components/dashboard/WorkloadByTeam';

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
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filters
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (deptFilter !== 'all' && t.department !== deptFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (dateRange === 'this_month') {
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        const created = new Date(t.created_date);
        // Include tasks created this month OR still open
        if (t.status === 'completed' || t.status === 'cancelled') {
          if (created < start || created > end) return false;
        }
      }
      return true;
    });
  }, [tasks, deptFilter, statusFilter, dateRange]);

  // Stats
  const totalTasks = filteredTasks.filter(t => t.status !== 'cancelled').length;
  const dueTodayStr = format(today, 'yyyy-MM-dd');
  const dueToday = filteredTasks.filter(t => t.due_date === dueTodayStr && t.status !== 'completed' && t.status !== 'cancelled').length;
  const overdueTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
    return new Date(t.due_date) < today;
  }).length;
  const pendingReview = filteredTasks.filter(t => t.status === 'review').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Task Management Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(today, 'EEEE, d MMMM yyyy')}</p>
        </div>
        <Link to="/Tasks" className="text-sm text-primary hover:underline font-medium">Go to Tasks →</Link>
      </div>

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DashboardStatCard title="TOTAL TASKS" value={totalTasks} icon={ClipboardList} variant="blue" />
        <DashboardStatCard title="DUE TODAY" value={dueToday} icon={Clock} variant="yellow" />
        <DashboardStatCard title="OVERDUE" value={overdueTasks} icon={AlertTriangle} variant="red" />
        <DashboardStatCard title="PENDING REVIEW" value={pendingReview} icon={FileCheck} variant="green" />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-card rounded-xl border">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {Object.entries(DEPT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setDeptFilter('all'); setStatusFilter('all'); setDateRange('this_month'); }}>
          Reset
        </Button>
      </div>

      {/* Row 2 — Completion + Trend + Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CompletionRateDonut tasks={filteredTasks} />
        <OverdueTrendChart tasks={tasks} />
        <EmployeeProductivity tasks={filteredTasks} users={users} />
      </div>

      {/* Row 3 — Top Performers + At Risk + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopPerformers tasks={filteredTasks} />
        <AtRiskEmployees tasks={filteredTasks} />
        <RecentActivity tasks={filteredTasks} />
      </div>

      {/* Row 4 — Distribution + Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskDistributionPie tasks={filteredTasks} />
        <WorkloadByTeam tasks={filteredTasks} />
      </div>
    </div>
  );
}