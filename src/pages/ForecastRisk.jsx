import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldAlert, Activity } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useUserList } from '@/hooks/useUserList';
import { usePermissionMatrix, getPerm } from '@/hooks/usePermissionMatrix';

import ForecastSummaryCards from '../components/forecast/ForecastSummaryCards';
import OverdueRiskTable from '../components/forecast/OverdueRiskTable';
import WorkloadOverloadTable from '../components/forecast/WorkloadOverloadTable';
import RiskDistributionChart from '../components/forecast/RiskDistributionChart';

const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_WEIGHT = { pending: 3, in_progress: 2, review: 1 };
const MAX_ACTIVE_TASKS = 8;

function computeScore(task, today) {
  if (!task.due_date) return 0;
  const daysLeft = differenceInDays(new Date(task.due_date), today);
  const priorityW = PRIORITY_WEIGHT[task.priority] || 2;
  const statusW = STATUS_WEIGHT[task.status] || 2;
  const checklist = task.checklist || [];
  const progress = checklist.length > 0 ? checklist.filter(c => c.checked).length / checklist.length : 0;
  const changePenalty = Math.min((task.due_date_change_count || 0) * 0.15, 0.6);

  let score = 0;
  if (daysLeft <= 0) score += 50;
  else if (daysLeft <= 1) score += 40;
  else if (daysLeft <= 3) score += 30;
  else if (daysLeft <= 7) score += 20;
  else if (daysLeft <= 14) score += 10;
  else score += 5;
  score += (1 - progress) * 20;
  score += priorityW * 4;
  score += statusW * 3;
  score += changePenalty * 15;
  return Math.min(100, Math.round(score));
}

export default function ForecastRisk() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const matrix = usePermissionMatrix();
  const role = currentUser?.role || 'staff';
  const canView = getPerm(matrix, 'forecast_risk', role) !== 'no';

  const { data: users = [] } = useUserList();
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks-forecast'],
    queryFn: () => base44.entities.Task.list('-created_date', 3000),
    staleTime: 3 * 60_000,
  });

  // Manager dept scoping
  const userDepts = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.departments?.length ? currentUser.departments : currentUser.department ? [currentUser.department] : [];
  }, [currentUser]);

  const isManagerOnly = ['manager', 'super_supervisor'].includes(role);

  const scopedTasks = useMemo(() => {
    if (isManagerOnly && userDepts.length) return allTasks.filter(t => userDepts.includes(t.department));
    return allTasks;
  }, [allTasks, isManagerOnly, userDepts]);

  // Compute summary stats
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const riskStats = useMemo(() => {
    const active = scopedTasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date);
    let critical = 0, high = 0, total = 0;
    active.forEach(t => {
      const s = computeScore(t, today);
      if (s >= 70) { critical++; total++; }
      else if (s >= 50) { high++; total++; }
      else if (s >= 25) total++;
    });
    const alreadyOverdue = scopedTasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date && t.due_date < todayStr).length;
    return { total, critical, high, alreadyOverdue };
  }, [scopedTasks]);

  const workloadStats = useMemo(() => {
    const staffMap = {};
    scopedTasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status) && t.assigned_to).forEach(t => {
      staffMap[t.assigned_to] = (staffMap[t.assigned_to] || 0) + 1;
    });
    const counts = Object.values(staffMap);
    const overload = counts.filter(c => c >= MAX_ACTIVE_TASKS).length;
    const nearFull = counts.filter(c => c >= MAX_ACTIVE_TASKS * 0.7 && c < MAX_ACTIVE_TASKS).length;
    const totalStaff = counts.length;
    const avgTasks = totalStaff > 0 ? (counts.reduce((s, c) => s + c, 0) / totalStaff).toFixed(1) : '0';
    return { overload, nearFull, totalStaff, avgTasks };
  }, [scopedTasks]);

  if (!canView && currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Forecast & Risk Management</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">พยากรณ์งานเสี่ยง Overdue และตรวจจับพนักงานที่งาน Overload — เพื่อป้องกันปัญหาล่วงหน้า</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          <ForecastSummaryCards riskStats={riskStats} workloadStats={workloadStats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <OverdueRiskTable tasks={scopedTasks} />
            </div>
            <div>
              <RiskDistributionChart tasks={scopedTasks} />
            </div>
          </div>

          <WorkloadOverloadTable tasks={scopedTasks} users={users} />
        </>
      )}
    </div>
  );
}