import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ClipboardList, AlertTriangle, Clock, FileCheck, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useUserList } from '@/hooks/useUserList';
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
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
  });
  const { data: users = [] } = useUserList();

  // Filters
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');
  const [appliedFilters, setAppliedFilters] = useState({ dept: 'all', status: 'all', dateRange: 'this_month' });

  const handleApply = () => {
    setAppliedFilters({ dept: deptFilter, status: statusFilter, dateRange });
  };

  const filteredTasks = useMemo(() => {
    const f = appliedFilters;
    return tasks.filter(t => {
      if (f.dept !== 'all' && t.department !== f.dept) return false;
      if (f.status !== 'all' && t.status !== f.status) return false;
      if (f.dateRange === 'this_month') {
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        const created = new Date(t.created_date);
        if (t.status === 'completed' || t.status === 'cancelled') {
          if (created < start || created > end) return false;
        }
      }
      return true;
    });
  }, [tasks, appliedFilters]);

  // Stats
  const totalTasks = filteredTasks.filter(t => t.status !== 'cancelled').length;
  const dueTodayStr = format(today, 'yyyy-MM-dd');
  const dueToday = filteredTasks.filter(t => t.due_date === dueTodayStr && t.status !== 'completed' && t.status !== 'cancelled').length;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const overdueTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
    return new Date(t.due_date) < todayStart;
  }).length;
  const pendingReview = filteredTasks.filter(t => t.status === 'review').length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Stat Cards — 5 columns like the reference */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <DashboardStatCard title="Total Tasks" value={totalTasks} icon={ClipboardList} variant="blue" />
        <DashboardStatCard title="Tasks Due Today" value={dueToday} icon={Clock} variant="yellow" />
        <DashboardStatCard title="Overdue Tasks" value={overdueTasks} icon={AlertTriangle} variant="red" />
        <DashboardStatCard title="Pending Review" value={pendingReview} icon={FileCheck} variant="green" />
        <DashboardStatCard title="Completed" value={completedTasks} icon={CheckCircle} variant="purple" />
      </div>

      {/* Filter Bar — labeled inline */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-white rounded-xl border shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Department:</span>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Object.entries(DEPT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Date Range:</span>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Task Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" className="h-8 text-xs px-5" onClick={handleApply}>
          Apply
        </Button>
      </div>

      {/* Row 1 — 3 equal charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CompletionRateDonut tasks={filteredTasks} />
        <OverdueTrendChart tasks={filteredTasks} />
        <EmployeeProductivity tasks={filteredTasks} users={users} />
      </div>

      {/* Row 2 — Top Performers (wider) + At Risk + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopPerformers tasks={filteredTasks} />
        <AtRiskEmployees tasks={filteredTasks} />
        <RecentActivity tasks={filteredTasks} />
      </div>

      {/* Row 3 — Bottom 2 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskDistributionPie tasks={filteredTasks} />
        <WorkloadByTeam tasks={filteredTasks} />
      </div>
    </div>
  );
}