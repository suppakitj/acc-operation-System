import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, Key, CreditCard, FileWarning, CalendarDays } from 'lucide-react';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import OverdueTasks from '../components/dashboard/OverdueTasks';
import TodaySchedule from '../components/dashboard/TodaySchedule';
import TaskStatusBarChart from '../components/dashboard/TaskStatusBarChart';
import DueIn7Days from '../components/dashboard/DueIn7Days';
import { useLanguage } from '../components/LanguageContext';

export default function Dashboard() {
  const { t } = useLanguage();
  const today = new Date();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });
  const { data: billings = [] } = useQuery({
    queryKey: ['billings'],
    queryFn: () => base44.entities.Billing.list('-created_date', 200),
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.Schedule.list('-date', 200),
  });
  const { data: peakLicenses = [] } = useQuery({
    queryKey: ['peakLicenses'],
    queryFn: () => base44.entities.PeakLicense.list('-created_date', 500),
  });

  // Stats calculations
  const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
    return new Date(t.due_date) < today;
  }).length;
  const dueIn3Days = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
    const d = differenceInDays(new Date(t.due_date), today);
    return d >= 0 && d <= 3;
  }).length;
  const completedToday = tasks.filter(t => t.completed_date === format(today, 'yyyy-MM-dd')).length;
  const activeCustomers = customers.filter(c => c.status === 'active');
  const peakUrgent = peakLicenses.filter(l => {
    if (l.license_status === 'cancelled' || !l.expiry_date) return false;
    const d = differenceInDays(new Date(l.expiry_date), today);
    return d >= 0 && d <= 30;
  }).length;
  const activeBillings = billings.filter(b => b.status !== 'cancelled');
  const billingPending = activeBillings.filter(b => b.status === 'sent' || b.status === 'overdue').length;
  // Missing docs — tasks with no attachments and status not completed
  const missingDocs = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && (!t.attachments || t.attachments.length === 0) && t.service_type === 'audit').length;
  const todayScheduleCount = schedules.filter(s => s.date === format(today, 'yyyy-MM-dd')).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Operations Overview</h1>
          <p className="text-sm text-muted-foreground">{format(today, 'EEEE, d MMMM yyyy')}</p>
        </div>
        <Link to="/Tasks" className="text-sm text-primary hover:underline font-medium">Task Control →</Link>
      </div>

      {/* Row 1 — Primary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <DashboardStatCard title="OPEN TASKS" value={openTasks} icon={ClipboardList} variant="blue" />
        <DashboardStatCard title="OVERDUE" value={overdueTasks} icon={AlertTriangle} variant="red" />
        <DashboardStatCard title="DUE IN 3 DAYS" value={dueIn3Days} icon={Clock} variant="yellow" />
        <DashboardStatCard title="COMPLETED TODAY" value={completedToday} icon={CheckCircle2} variant="green" />
        <DashboardStatCard title="PEAK URGENT" value={peakUrgent} icon={Key} variant="purple" />
      </div>

      {/* Row 2 — Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <DashboardStatCard title="BILLING PENDING" value={billingPending} icon={CreditCard} variant="yellow" />
        <DashboardStatCard title="MISSING DOCS" value={missingDocs} icon={FileWarning} variant="yellow" />
        <DashboardStatCard title="TODAY'S SCHEDULE" value={todayScheduleCount} icon={CalendarDays} variant="default" />
      </div>

      {/* Row 3 — Overdue + Today Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <OverdueTasks tasks={tasks} />
        </div>
        <div className="lg:col-span-2">
          <TodaySchedule schedules={schedules} />
        </div>
      </div>

      {/* Row 4 — Chart + Due in 7 Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskStatusBarChart tasks={tasks} />
        <DueIn7Days tasks={tasks} />
      </div>
    </div>
  );
}