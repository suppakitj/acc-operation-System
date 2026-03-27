import React from 'react';
import { ClipboardList, Users, AlertTriangle, Copy } from 'lucide-react';

export default function GenerationStats({ result }) {
  if (!result) return null;

  const stats = [
    { label: 'Templates ที่ตรงเดือน', value: result.total_templates, icon: ClipboardList, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Tasks ที่จะสร้าง', value: result.total_tasks, icon: Users, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'ข้ามเพราะซ้ำ', value: result.skipped_duplicate, icon: Copy, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'ไม่มีลูกค้าตรง', value: result.skipped_no_match, icon: AlertTriangle, color: 'bg-gray-50 text-gray-600 border-gray-200' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${s.color}`}>
          <s.icon className="w-4 h-4 shrink-0" />
          <div>
            <p className="text-lg font-bold leading-tight">{s.value}</p>
            <p className="text-[10px] opacity-70">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}