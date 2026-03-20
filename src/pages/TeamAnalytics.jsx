import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart3, Building2, CalendarDays, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAccessControl } from '../components/auth/useAccessControl';
import TeamSummaryCards from '../components/analytics/TeamSummaryCards';
import ProductivityTrend from '../components/analytics/ProductivityTrend';
import AvgCompletionTime from '../components/analytics/AvgCompletionTime';
import WorkloadByEmployee from '../components/analytics/WorkloadByEmployee';
import CompletionRateByService from '../components/analytics/CompletionRateByService';
import TopOverdueEmployees from '../components/analytics/TopOverdueEmployees';
import TopPerformers from '../components/analytics/TopPerformers';
import OnTimeRateTable from '../components/analytics/OnTimeRateTable';

const DEPT_OPTIONS = [
  { value: 'all', label: 'ทุกแผนก (ภาพรวม)' },
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

export default function TeamAnalytics() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
    staleTime: 60_000, // analytics data — 1 min cache
  });

  const filteredTasks = useMemo(() => {
    if (deptFilter === 'all') return tasks;
    return tasks.filter(t => t.department === deptFilter);
  }, [tasks, deptFilter]);

  if (!ac.canViewTeamAnalytics && currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-muted-foreground">คุณไม่มีสิทธิ์ดูหน้า Team Analytics</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const selectedLabel = DEPT_OPTIONS.find(d => d.value === deptFilter)?.label;

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]);
    tasks.forEach(t => {
      if (t.created_date) years.add(new Date(t.created_date).getFullYear());
      if (t.due_date) years.add(new Date(t.due_date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [tasks]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Team Analytics
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Visualize team productivity, completion times, and workload distribution
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="เลือกแผนก" />
            </SelectTrigger>
            <SelectContent>
              {DEPT_OPTIONS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CalendarDays className="w-4 h-4 text-muted-foreground ml-2" />
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>ปี {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deptFilter !== 'all' && (
            <Badge variant="secondary" className="text-[10px]">
              {filteredTasks.length} tasks
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <TeamSummaryCards tasks={filteredTasks} />
      {/* Row 1: Productivity Trend + Avg Completion Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProductivityTrend tasks={filteredTasks} />
        <AvgCompletionTime tasks={filteredTasks} />
      </div>

      {/* Row 2: Workload + Service Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkloadByEmployee tasks={filteredTasks} />
        <CompletionRateByService tasks={filteredTasks} />
      </div>

      {/* Row 3: Top Overdue + Top Performer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopOverdueEmployees tasks={filteredTasks} year={selectedYear} />
        <TopPerformers tasks={filteredTasks} year={selectedYear} />
      </div>

      {/* Row 4: On-Time Rate Table */}
      <OnTimeRateTable tasks={filteredTasks} year={selectedYear} />
    </div>
  );
}