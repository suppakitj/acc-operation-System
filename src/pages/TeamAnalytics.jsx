import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart3, Building2, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TeamSummaryCards from '../components/analytics/TeamSummaryCards';
import ProductivityTrend from '../components/analytics/ProductivityTrend';
import AvgCompletionTime from '../components/analytics/AvgCompletionTime';
import WorkloadByEmployee from '../components/analytics/WorkloadByEmployee';
import CompletionRateByService from '../components/analytics/CompletionRateByService';
import TopOverdueEmployees from '../components/analytics/TopOverdueEmployees';
import ResizableChartWrapper from '../components/analytics/ResizableChartWrapper';

const DEPT_OPTIONS = [
  { value: 'all', label: 'ทุกแผนก (ภาพรวม)' },
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

const STORAGE_KEY = 'team_analytics_chart_order';

const DEFAULT_ORDER = [
  'productivity',
  'avg_completion',
  'workload',
  'service_dist',
  'top_overdue',
];

const CHART_LABELS = {
  productivity: 'Team Productivity (6 Months)',
  avg_completion: 'Avg Completion Time by Dept',
  workload: 'Workload Distribution',
  service_dist: 'Tasks by Service Type',
  top_overdue: 'Top 5 Overdue',
};

function getInitialOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure all items exist
      if (Array.isArray(parsed) && DEFAULT_ORDER.every(id => parsed.includes(id))) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_ORDER;
}

export default function TeamAnalytics() {
  const [deptFilter, setDeptFilter] = useState('all');
  const [chartOrder, setChartOrder] = useState(getInitialOrder);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
  });

  const filteredTasks = useMemo(() => {
    if (deptFilter === 'all') return tasks;
    return tasks.filter(t => t.department === deptFilter);
  }, [tasks, deptFilter]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    const newOrder = Array.from(chartOrder);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setChartOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, [chartOrder]);

  const renderChart = (id) => {
    switch (id) {
      case 'productivity': return <ProductivityTrend tasks={filteredTasks} />;
      case 'avg_completion': return <AvgCompletionTime tasks={filteredTasks} />;
      case 'workload': return <WorkloadByEmployee tasks={filteredTasks} />;
      case 'service_dist': return <CompletionRateByService tasks={filteredTasks} />;
      case 'top_overdue': return <TopOverdueEmployees tasks={filteredTasks} />;
      default: return null;
    }
  };

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

      {/* Drag hint */}
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <GripVertical className="w-3 h-3" /> ลากเพื่อจัดเรียงกราฟ · ลากขอบล่างเพื่อปรับขนาด
      </p>

      {/* Draggable Charts */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="charts">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {chartOrder.map((id, index) => (
                <Draggable key={id} draggableId={id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 rounded-xl' : ''}`}
                    >
                      <div className="relative group">
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="absolute -left-1 top-3 z-10 flex items-center gap-1 px-1.5 py-1 rounded-md bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">{CHART_LABELS[id]}</span>
                        </div>
                        <ResizableChartWrapper chartId={id}>
                          {renderChart(id)}
                        </ResizableChartWrapper>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}