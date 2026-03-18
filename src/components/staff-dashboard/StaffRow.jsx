import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StaffTaskList from './StaffTaskList';
import StaffServiceBreakdown from './StaffServiceBreakdown';

export default function StaffRow({ staff }) {
  const [expanded, setExpanded] = useState(false);

  const totalAssigned = staff.pending.length + staff.completed.length;
  const completionRate = totalAssigned > 0 ? Math.round((staff.completed.length / totalAssigned) * 100) : 0;

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Summary Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {staff.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Name & Dept */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{staff.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{staff.email}</p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4">
          <StatBadge icon={Clock} label="ค้าง" value={staff.pending.length} color="text-blue-600" bg="bg-blue-50" />
          <StatBadge icon={AlertTriangle} label="เกินกำหนด" value={staff.overdue.length} color="text-red-600" bg="bg-red-50" />
          <StatBadge icon={CheckCircle2} label="เสร็จเดือนนี้" value={staff.completedThisMonth.length} color="text-green-600" bg="bg-green-50" />
        </div>

        {/* Completion Rate */}
        <div className="hidden md:flex flex-col items-end gap-1 w-24 shrink-0">
          <span className="text-xs font-medium">{completionRate}%</span>
          <Progress value={completionRate} className="h-1.5 w-full" />
        </div>

        {/* Expand */}
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Mobile stats row */}
      <div className="sm:hidden flex items-center gap-3 px-4 pb-3">
        <StatBadge icon={Clock} label="ค้าง" value={staff.pending.length} color="text-blue-600" bg="bg-blue-50" />
        <StatBadge icon={AlertTriangle} label="เกิน" value={staff.overdue.length} color="text-red-600" bg="bg-red-50" />
        <StatBadge icon={CheckCircle2} label="เสร็จ" value={staff.completedThisMonth.length} color="text-green-600" bg="bg-green-50" />
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pending Tasks */}
            <div className="lg:col-span-2">
              <StaffTaskList
                pendingTasks={staff.pending}
                completedTasks={staff.completedThisMonth}
                overdueTasks={staff.overdue}
              />
            </div>
            {/* Service Breakdown */}
            <div>
              <StaffServiceBreakdown byService={staff.byService} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${bg}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  );
}