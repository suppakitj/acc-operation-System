import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, ShieldAlert } from 'lucide-react';
import { differenceInDays, addDays } from 'date-fns';
import { useUserList } from '@/hooks/useUserList';

import PeriodSelector from '@/components/shared/PeriodSelector';
import { defaultPeriodState, resolvePeriod } from '@/utils/periodUtils';
import KpiScorecard from '../components/kpi/KpiScorecard';
import SlaComplianceTable from '../components/kpi/SlaComplianceTable';
import TeamPerformanceTable from '../components/kpi/TeamPerformanceTable';
import KpiTrendChart from '../components/kpi/KpiTrendChart';
import DeadlineRiskPanel from '../components/kpi/DeadlineRiskPanel';

function computeKpi(tasks, timeEntries, from, to, activeUsers) {
  const start = new Date(from), end = new Date(to + 'T23:59:59');
  const isInPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const completed = tasks.filter(t => t.status === 'completed' && isInPeriod(t.completed_date));
  const onTime = completed.filter(t => t.due_date && t.completed_date <= t.due_date);
  const onTimeRate = completed.length > 0 ? (onTime.length / completed.length) * 100 : 0;

  const tasksInPeriod = tasks.filter(t => isInPeriod(t.start_date || t.created_date));
  const totalInPeriod = tasksInPeriod.length;

  const overdue = tasks.filter(t => t.due_date && !['completed', 'cancelled'].includes(t.status) && new Date(t.due_date) < todayStart);
  const overdueOver3 = overdue.filter(t => differenceInDays(todayStart, new Date(t.due_date)) > 3).length;

  const urgentHighPending = tasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && ['urgent', 'high'].includes(t.priority)).length;

  const avgCompletionDays = completed.length > 0
    ? completed.reduce((s, t) => {
        const st = t.start_date || t.created_date;
        if (!st) return s;
        return s + Math.max(0, differenceInDays(new Date(t.completed_date), new Date(st)));
      }, 0) / completed.length
    : 0;

  const dueDateChangedCount = tasksInPeriod.filter(t => (t.due_date_change_count || 0) >= 1).length;
  const dueDateChangeRate = totalInPeriod > 0 ? (dueDateChangedCount / totalInPeriod) * 100 : 0;

  const periodEntries = timeEntries.filter(e => e.start_time && isInPeriod(e.start_time));
  const totalLoggedMinutes = periodEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const totalLoggedHours = totalLoggedMinutes / 60;
  const daySpan = Math.max(1, differenceInDays(end, start));
  const workingDays = Math.round(daySpan * 5 / 7);
  const totalCapacityHours = activeUsers.length * workingDays * 8;
  const utilization = totalCapacityHours > 0 ? (totalLoggedHours / totalCapacityHours) * 100 : 0;

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

  const [period, setPeriod] = useState(() => {
    const s = defaultPeriodState();
    const resolved = resolvePeriod(s);
    return { ...s, resolved };
  });
  const [deptFilter, setDeptFilter] = useState('all');
  const [svcFilter, setSvcFilter] = useState('all');

  const role = currentUser?.role;
  const isMD = ['admin', 'management'].includes(role);
  const isManagerOrSupervisor = ['manager', 'super_supervisor'].includes(role);

  const userDepts = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.departments?.length ? currentUser.departments : currentUser.department ? [currentUser.department] : [];
  }, [currentUser]);
  const lockedDept = isManagerOrSupervisor && userDepts.length > 0 ? userDepts[0] : null;

  const from = period.resolved?.from || '';
  const to = period.resolved?.to || '';
  const cmpFrom = period.comparisonResolved?.from || '';
  const cmpTo = period.comparisonResolved?.to || '';

  const activeDept = lockedDept || deptFilter;
  const scopedTasks = useMemo(() => {
    let t = allTasks;
    if (isManagerOrSupervisor && userDepts.length) t = t.filter(task => userDepts.includes(task.department));
    else if (activeDept !== 'all') t = t.filter(task => task.department === activeDept);
    if (svcFilter !== 'all') t = t.filter(task => task.service_type === svcFilter);
    return t;
  }, [allTasks, activeDept, svcFilter, isManagerOrSupervisor, userDepts]);

  const scopedEntries = useMemo(() => {
    let e = allTimeEntries;
    if (isManagerOrSupervisor && userDepts.length) e = e.filter(entry => userDepts.includes(entry.department));
    else if (activeDept !== 'all') e = e.filter(entry => entry.department === activeDept);
    if (svcFilter !== 'all') e = e.filter(entry => entry.service_type === svcFilter);
    return e;
  }, [allTimeEntries, activeDept, svcFilter, isManagerOrSupervisor, userDepts]);

  const activeUsers = useMemo(() => users.filter(u => u.user_status !== 'inactive'), [users]);

  const kpi = useMemo(() => from && to ? computeKpi(scopedTasks, scopedEntries, from, to, activeUsers) : null, [scopedTasks, scopedEntries, from, to, activeUsers]);
  const prevKpi = useMemo(() => cmpFrom && cmpTo ? computeKpi(scopedTasks, scopedEntries, cmpFrom, cmpTo, activeUsers) : null, [scopedTasks, scopedEntries, cmpFrom, cmpTo, activeUsers]);

  const slaData = useMemo(() => {
    if (!from || !to) return [];
    const start = new Date(from), end = new Date(to + 'T23:59:59');
    return SVC_TYPES.map(svc => {
      const completed = scopedTasks.filter(t => t.status === 'completed' && t.service_type === svc && t.completed_date && new Date(t.completed_date) >= start && new Date(t.completed_date) <= end);
      const onTime = completed.filter(t => t.due_date && t.completed_date <= t.due_date);
      return { service: svc, total: completed.length, onTime: onTime.length, late: completed.length - onTime.length, rate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0 };
    }).filter(d => d.total > 0);
  }, [scopedTasks, from, to]);

  const performanceData = useMemo(() => {
    if (!from || !to) return [];
    const start = new Date(from), end = new Date(to + 'T23:59:59');
    const isInPeriod = (d) => d && new Date(d) >= start && new Date(d) <= end;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (isMD && activeDept === 'all') {
      const deptMap = {};
      scopedTasks.forEach(t => {
        const dept = t.department || 'other';
        if (!deptMap[dept]) deptMap[dept] = { name: DEPT_LABELS[dept] || dept, totalTasks: 0, completed: 0, onTimeCount: 0, avgDaysSum: 0, avgDaysCount: 0, overdueCount: 0, dueDateChangedCount: 0, department: dept };
        const d = deptMap[dept];
        if (isInPeriod(t.start_date || t.created_date)) { d.totalTasks++; if ((t.due_date_change_count || 0) >= 1) d.dueDateChangedCount++; }
        if (t.status === 'completed' && isInPeriod(t.completed_date)) {
          d.completed++; if (t.due_date && t.completed_date <= t.due_date) d.onTimeCount++;
          const st = t.start_date || t.created_date; if (st) { d.avgDaysSum += Math.max(0, differenceInDays(new Date(t.completed_date), new Date(st))); d.avgDaysCount++; }
        }
        if (t.due_date && !['completed', 'cancelled'].includes(t.status) && new Date(t.due_date) < todayStart) d.overdueCount++;
      });
      return Object.values(deptMap).map(d => ({ ...d, onTimeRate: d.completed > 0 ? (d.onTimeCount / d.completed) * 100 : 0, avgDays: d.avgDaysCount > 0 ? d.avgDaysSum / d.avgDaysCount : 0, dueDateChangedPct: d.totalTasks > 0 ? (d.dueDateChangedCount / d.totalTasks) * 100 : 0 }));
    }

    const staffMap = {};
    scopedTasks.forEach(t => {
      const email = t.assigned_to || 'unassigned';
      if (!staffMap[email]) {
        const u = users.find(u => u.email === email);
        staffMap[email] = { name: u?.initials || u?.nickname || t.assigned_name || email, totalTasks: 0, completed: 0, onTimeCount: 0, avgDaysSum: 0, avgDaysCount: 0, overdueCount: 0, dueDateChangedCount: 0, department: u?.department || t.department || '' };
      }
      const s = staffMap[email];
      if (isInPeriod(t.start_date || t.created_date)) { s.totalTasks++; if ((t.due_date_change_count || 0) >= 1) s.dueDateChangedCount++; }
      if (t.status === 'completed' && isInPeriod(t.completed_date)) {
        s.completed++; if (t.due_date && t.completed_date <= t.due_date) s.onTimeCount++;
        const st = t.start_date || t.created_date; if (st) { s.avgDaysSum += Math.max(0, differenceInDays(new Date(t.completed_date), new Date(st))); s.avgDaysCount++; }
      }
      if (t.due_date && !['completed', 'cancelled'].includes(t.status) && new Date(t.due_date) < todayStart) s.overdueCount++;
    });
    return Object.values(staffMap).map(s => ({ ...s, onTimeRate: s.completed > 0 ? (s.onTimeCount / s.completed) * 100 : 0, avgDays: s.avgDaysCount > 0 ? s.avgDaysSum / s.avgDaysCount : 0, dueDateChangedPct: s.totalTasks > 0 ? (s.dueDateChangedCount / s.totalTasks) * 100 : 0 }));
  }, [scopedTasks, from, to, isMD, activeDept, users]);

  const atRiskTasks = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in7Str = addDays(today, 7).toISOString().split('T')[0];
    return scopedTasks
      .filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date && t.due_date >= todayStr && t.due_date <= in7Str)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [scopedTasks]);

  const isLoading = loadingTasks || loadingTime;

  if (role && !isMD && !isManagerOrSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-muted-foreground mt-1">เฉพาะ Admin, Management, Manager และ Super Supervisor</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">KPI Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">ภาพรวม KPI และ SLA ขององค์กร — ติดตามประสิทธิภาพและคุณภาพงาน</p>
      </div>

      <PeriodSelector value={period} onChange={setPeriod} showComparison={true} />

      {/* Department & Service filters */}
      {!lockedDept && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-9 rounded-md border px-3 text-sm bg-background">
            <option value="all">ทุกแผนก</option>
            {Object.entries(DEPT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={svcFilter} onChange={(e) => setSvcFilter(e.target.value)} className="h-9 rounded-md border px-3 text-sm bg-background">
            <option value="all">ทุกบริการ</option>
            {SVC_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          {kpi && <KpiScorecard kpi={kpi} prevKpi={prevKpi} />}
          <SlaComplianceTable slaData={slaData} />
          <TeamPerformanceTable performanceData={performanceData} isMD={isMD && activeDept === 'all'} />
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