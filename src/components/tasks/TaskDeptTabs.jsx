import React from 'react';
import { Badge } from '@/components/ui/badge';

const DEPT_COLORS = {
  accounting: 'bg-green-100 text-green-700',
  audit: 'bg-purple-100 text-purple-700',
  consulting: 'bg-blue-100 text-blue-700',
  billing: 'bg-yellow-100 text-yellow-700',
  management: 'bg-orange-100 text-orange-700',
  it: 'bg-gray-100 text-gray-700',
};

export default function TaskDeptTabs({ tasks }) {
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const deptCounts = {};
  active.forEach(t => {
    const d = t.department || 'other';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });

  const entries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium">Open by dept:</span>
      {entries.map(([dept, count]) => (
        <Badge key={dept} variant="secondary" className={`text-[11px] ${DEPT_COLORS[dept] || 'bg-gray-100 text-gray-700'}`}>
          {dept.charAt(0).toUpperCase() + dept.slice(1)}: {count}
        </Badge>
      ))}
    </div>
  );
}