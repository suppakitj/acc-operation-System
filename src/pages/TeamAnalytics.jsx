import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart3 } from 'lucide-react';
import TeamSummaryCards from '../components/analytics/TeamSummaryCards';
import ProductivityTrend from '../components/analytics/ProductivityTrend';
import AvgCompletionTime from '../components/analytics/AvgCompletionTime';
import WorkloadByEmployee from '../components/analytics/WorkloadByEmployee';
import CompletionRateByService from '../components/analytics/CompletionRateByService';

export default function TeamAnalytics() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Team Analytics
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Visualize team productivity, completion times, and workload distribution
        </p>
      </div>

      {/* Summary Cards */}
      <TeamSummaryCards tasks={tasks} />

      {/* Row 1: Productivity Trend + Avg Completion Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProductivityTrend tasks={tasks} />
        <AvgCompletionTime tasks={tasks} />
      </div>

      {/* Row 2: Workload + Service Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkloadByEmployee tasks={tasks} />
        <CompletionRateByService tasks={tasks} />
      </div>
    </div>
  );
}