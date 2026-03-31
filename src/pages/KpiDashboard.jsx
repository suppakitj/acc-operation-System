import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, ShieldAlert } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, addDays, differenceInDays } from 'date-fns';
import { useUserList } from '@/hooks/useUserList';

import KpiFilters from '../components/kpi/KpiFilters';
import KpiScorecard from '../components/kpi/KpiScorecard';
import SlaComplianceTable from '../components/kpi/SlaComplianceTable';
import TeamPerformanceTable from '../components/kpi/TeamPerformanceTable';
import KpiTrendChart from '../components/kpi/KpiTrendChart';
import DeadlineRiskPanel from '../components/kpi/DeadlineRiskPanel';

function getDateRange(period, dateFrom, dateTo) {
  const now = new Date();
  if (period === 'this_month') return { start: startOfMonth(now), end: endOfMonth(now) };
  if (period === 'this_quarter') return { start: startOfQuarter(now), end: endOfQuarter(now) };
  if (period === 'this_year') return { start: startOfYear(now), end: endOfYear(now) };
  if (period === 'custom' && dateFrom && dateTo) return { start: new Date(dateFrom), end: new Date(dateTo + 'T23:59:59') };
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

function computeKpi(tasks, timeEntries, dateRange, activeUsers) {
  const isInPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= dateRange.start && d <= dateRange.end;
  };

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Completed tasks in period
  const completed = tasks.filter(t => t.status === 'completed' && isInPeriod(t.completed_date));
  const onTime = completed.filter(t => t.due_date && t.completed_date <= t.due_date);
  const onTimeRate = completed.length > 0 ? (onTime.length / completed.length) * 100 : 0;

  // All tasks started/created in period
  const tasksInPeriod = tasks.filter(t => isInPeriod(t.start_date || t.created_date));
  const totalInPeriod = tasksInPeriod.length;

  // Overdue
  const overdue = tasks.filter(t => t.due_date && !['completed', 'cancelled'].includes(t.status) && new Date(t.due_date) < todayStart);
  const overdueOver3 = overdue.filter(t => differenceInDays(todayStart, new Date(t.due_date)) > 3).length;

  // Urgent/High pending
  const urgentHighPending = tasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && ['urgent', 'high'].includes(t.priority)).length;

  // Avg completion time
  const avgCompletionDays = completed.length > 0
    ? completed.reduce((s, t) => {
        const start = t.start_date || t.created_date;
        if (!start) return s;
        return s + Math.max(0, differenceInDays(new Date(t.completed_date), new Date(start)));
      }, 0) / completed.length
    : 0;

  // Due date change rate
  const dueDateChangedCount = tasksInPeriod.filter(t => (t.due_date_change_count || 0) >= 1).length;
  const dueDateChangeRate = totalInPeriod > 0 ? (dueDateChangedCount / totalInPeriod) * 100 : 0;

  // Staff utilization
  const periodEntries = timeEntries.filter(e => e.start_time && isInPeriod(e.start_time));
  const totalLoggedMinutes = periodEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const totalLoggedHours = totalLoggedMinutes / 60;
  const daySpan = Math.max(1, differenceInDays(dateRange.end, dateRange.start));
  const workingDays = Math.round(daySpan * 5 / 7); // rough estimate
  const totalCapacityHours = activeUsers.length * workingDays * 8;
  const utilization = totalCapacityHours > 0 ? (totalLoggedHours / totalCapacityHours) * 100 : 0;

  // Recurring task completion
  const recurringInPeriod = tasksInPeriod.filter(t => t.is_recurring);
  const recurringCompleted = recurringInPeriod.filter(t => t.status === 'completed').length;
  const recurringCompletionRate = recurringInPeriod.length > 0 ? (recurringCompleted / recurringInPeriod.length) * 100 : 0;

  return {
    onTimeRate, completedCount: completed.length, totalInPeriod,
    overdueCount: overdue.length, overdueOver3, urgentHighPending,
    avgCompletionDays, dueDateChangeRate, dueDateChangedCount,
    utilization, totalLoggedHours,
    recurringCompletionRate, recurringCompleted, recurringTotal: recurringInPeriod.length,
  };
}

const SVC_TYPES = ['accounting', 'payroll', 'tax_consulting', 'audit', 'peak_licensing'];
const DEPT_LABELS = { management: 'Management', accounting: 'Accounting', consulting: 'Consulting', audit: 'Audit', billing: 'Billing', it: 'IT' };

export default function KpiDashboard() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: users = [] } = useUserList();
  const { data: allTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks-kpi'], queryFn: () => base44.entities.Task.list('-created_date', 2000), staleTime: 5 * 60_000,
  });
  const { data: allTimeEntries = [], isLoading: loadingTime } = useQuery({
    queryKey: ['timeEntries-kpi'], queryFn: () => base44.entities.TimeEntry.list('-start_time', 2000), staleTime: 5 * 60_000,
  });

  const [filters, setFilters] = useState({ period: 'this_month', dateFrom: '', dateTo: '', department: 'all', serviceType: 'all' });

  const role = currentUser?.role;
  const isMD = ['admin', 'management'].includes(role);
  const isManagerOrSupervisor = ['manager', 'super_supervisor'].includes(role);

  // Access denied for staff
  if (role && !isMD && !isManagerOrSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-muted-foreground mt-1">เฉพาะ Admin, Management, Manager และ Super Supervisor</p>
      </div>
    );
  }

  // Locked dept for managers
  const userDepts = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.departments?.length ? currentUser.departments : currentUser.department ? [currentUser.department] : [];
  }, [currentUser]);
  const lockedDept = isManagerOrSupervisor && userDepts.length > 0 ? userDepts[0] : null;

  const dateRange = useMemo(() => getDateRange(filters.period, filters.dateFrom, filters.dateTo), [filters.period, filters.dateFrom, filters.dateTo]);
  const prevRange = useMemo(() => {
    const prevStart = subMonths(dateRange.start, 1);
    return { start: startOfMonth(prevStart), end: endOfMonth(prevStart) };
  }, [dateRange]);

  // Scope tasks/entries by department
  const deptFilter = lockedDept || filters.department;
  const scopedTasks = useMemo(() => {
    let t = allTasks;
    if (isManagerOrSupervisor && userDepts.length) t = t.filter(task => userDepts.includes(task.department));
    else if (deptFilter !== 'all') t = t.filter(task => task.department === deptFilter);
    if (filters.serviceType !== 'all') t = t.filter(task => task.service_type === filters.serviceType);
    return t;
  }, [allTasks, deptFilter, filters.serviceType, isManagerOrSupervisor, userDepts]);

  const scopedEntries = useMemo(() => {
    let e = allTimeEntries;
    if (isManagerOrSupervisor && userDepts.length) e = e.filter(entry => userDepts.includes(entry.department));
    else if (deptFilter !== 'all') e = e.filter(entry => entry.department === deptFilter);
    if (filters.serviceType !== 'all') e = e.filter(entry => entry.service_type === filters.serviceType);
    return e;
  }, [allTimeEntries, deptFilter, filters.serviceType, isManagerOrSupervisor, userDepts]);

  const activeUsers = useMemo(() => users.filter(u => u.user_status !== 'inactive'), [users]);

  // KPI current & previous
  const kpi = useMemo(() => computeKpi(scopedTasks, scopedEntries, dateRange, activeUsers), [scopedTasks, scopedEntries, dateRange, activeUsers]);
  const prevKpi = useMemo(() => computeKpi(scopedTasks, scopedEntries, prevRange, activeUsers), [scopedTasks, scopedEntries, prevRange, activeUsers]);

  // SLA data
  const slaData = useMemo(() => {
    return SVC_TYPES.map(svc => {
      const completed = scopedTasks.filter(t => t.status === 'completed' && t.service_type === svc && t.completed_date && new Date(t.completed_date) >= dateRange.start && new Date(t.completed_date) <= dateRange.end);
      const onTime = completed.filter(t => t.due_date && t.completed_date <= t.due_date);
      return {
        service: svc, total: completed.length, onTime: onTime.length, late: completed.length - onTime.length,
        rate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0,
      };
    }).filter(d => d.total > 0);
  }, [scopedTasks, dateRange]);

  // Team performance data
  const performanceData = useMemo(() => {
    const isInPeriod = (d) => d && new Date(d) >= dateRange.start && new Date(d) <= dateRange.end;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (isMD && deptFilter === 'all') {
      // Group by department
      const deptMap = {};
      scopedTasks.forEach(t => {
        const dept = t.department || 'other';
        if (!deptMap[dept]) deptMap[dept] = { name: DEPT_LABELS[dept] || dept, totalTasks: 0, completed: 0, onTimeCount: 0, avgDaysSum: 0, avgDaysCount: 0, overdueCount: 0, dueDateChangedCount: 0, department: dept };
        const d = deptMap[dept];
        if (isInPeriod(t.start_date || t.created_date)) {
          d.totalTasks++;
          if ((t.due_date_change_count || 0) >= 1) d.dueDateChangedCount++;
        }
        if (t.status === 'completed' && isInPeriod(t.completed_date)) {
          d.completed++;
          if (t.due_date && t.completed_date <= t.due_date) d.onTimeCount++;
          const start = t.start_date || t.created_date;
          if (start) { d.avgDaysSum += Math.max(0, differenceInDays(new Date(t.completed_date), new Date(start))); d.avgDaysCount++; }
        }
        if (t.due_date && !['completed', 'cancelled'].includes(t.status) && new Date(t.due_date) < todayStart) d.overdueCount++;
      });
      return Object.values(deptMap).map(d => ({
        ...d, onTimeRate: d.completed > 0 ? (d.onTimeCount / d.completed) * 100 : 0,
        avgDays: d.avgDaysCount > 0 ? d.avgDaysSum / d.avgDaysCount : 0,
        dueDateChangedPct: d.totalTasks > 0 ? (d.dueDateChangedCount / d.totalTasks) * 100 : 0,
      }));
    }

    // Group by staff
    const staffMap = {};
    scopedTasks.forEach(t => {
      const email = t.assigned_to || 'unassigned';
      if (!staffMap[email]) {
        const u = users.find(u => u.email === email);
        staffMap[email] = { name: u?.initials || u?.nickname || t.assigned_name || email, totalTasks: 0, completed: 0, onTimeCount: 0, avgDaysSum: 0, avgDaysCount: 0, overdueCount: 0, dueDateChangedCount: 0, department: u?.department || t.department || '' };
      }
      const s = staffMap[email];
      if (isInPeriod(t.start_date || t.created_date)) {
        s.totalTasks++;
        if ((t.due_date_change_count || 0) >= 1) s.dueDateChangedCount++;
      }
      if (t.status === 'completed' && isInPeriod(t.completed_date)) {
        s.completed++;
        if (t.due_date && t.completed_date <= t.due_date) s.onTimeCount++;
        const start = t.start_date || t.created_date;
        if (start) { s.avgDaysSum += Math.max(0, differenceInDays(new Date(t.completed_date), new Date(start))); s.avgDaysCount++; }
      }
      if (t.due_date && !['completed', 'cancelled'].includes(t.status) && new Date(t.due_date) < todayStart) s.overdueCount++;
    });
    return Object.values(staffMap).map(s => ({
      ...s, onTimeRate: s.completed > 0 ? (s.onTimeCount / s.completed) * 100 : 0,
      avgDays: s.avgDaysCount > 0 ? s.avgDaysSum / s.avgDaysCount : 0,
      dueDateChangedPct: s.totalTasks > 0 ? (s.dueDateChangedCount / s.totalTasks) * 100 : 0,
    }));
  }, [scopedTasks, dateRange, isMD, deptFilter, users]);

  // Deadline risk
  const atRiskTasks = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in7Days = addDays(today, 7);
    const in7Str = in7Days.toISOString().split('T')[0];
    return scopedTasks
      .filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date && t.due_date >= todayStr && t.due_date <= in7Str)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [scopedTasks]);

  const isLoading = loadingTasks || loadingTime;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">KPI Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">ภาพรวม KPI และ SLA ขององค์กร — ติดตามประสิทธิภาพและคุณภาพงาน</p>
      </div>

      <KpiFilters filters={filters} setFilters={setFilters} lockedDept={lockedDept} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          <KpiScorecard kpi={kpi} prevKpi={prevKpi} />
          <SlaComplianceTable slaData={slaData} />
          <TeamPerformanceTable performanceData={performanceData} isMD={isMD && deptFilter === 'all'} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <KpiTrendChart tasks={scopedTasks} />
            </div>
            <div className="lg:col-span-2">
              <DeadlineRiskPanel atRiskTasks={atRiskTasks} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}