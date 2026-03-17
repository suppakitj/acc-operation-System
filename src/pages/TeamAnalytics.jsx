import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart3, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import TeamSummaryCards from '../components/analytics/TeamSummaryCards';
import ProductivityTrend from '../components/analytics/ProductivityTrend';
import AvgCompletionTime from '../components/analytics/AvgCompletionTime';
import WorkloadByEmployee from '../components/analytics/WorkloadByEmployee';
import CompletionRateByService from '../components/analytics/CompletionRateByService';
import TopOverdueEmployees from '../components/analytics/TopOverdueEmployees';

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
  const [deptFilter, setDeptFilter] = useState('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
  });

  const filteredTasks = useMemo(() => {
    if (deptFilter === 'all') return tasks;
    return tasks.filter(t => t.department === deptFilter);
  }, [tasks, deptFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const selectedLabel = DEPT_OPTIONS.find(d => d.value === deptFilter)?.label;

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
        <div className="flex items-center gap-2">
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

      {/* Row 3: Top Overdue Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopOverdueEmployees tasks={filteredTasks} />
      </div>
    </div>
  );
}