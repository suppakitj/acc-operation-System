import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'd MMM yyyy', { locale: th });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'd MMM yyyy HH:mm', { locale: th });
}

const ROLE_LABELS = {
  admin: 'Admin',
  management: 'Management',
  manager: 'Manager',
  super_supervisor: 'Super Supervisor',
  staff: 'Staff',
};

export default function DueDateChangeHistory({ task }) {
  const [expanded, setExpanded] = useState(false);

  const history = task?.due_date_change_history || [];
  const count = task?.due_date_change_count || 0;

  if (count === 0) return null;

  const isWarning = count >= 3;

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${isWarning ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isWarning ? (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          ) : (
            <History className="w-4 h-4 text-amber-600" />
          )}
          <span className={`text-xs font-semibold ${isWarning ? 'text-red-700' : 'text-amber-700'}`}>
            Due Date ถูกเปลี่ยน {count} ครั้ง
          </span>
          {isWarning && (
            <Badge className="text-[9px] bg-red-100 text-red-700 border-red-300" variant="outline">
              ⚠ เปลี่ยนบ่อย
            </Badge>
          )}
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'ซ่อน' : 'ดูประวัติ'}
          </Button>
        )}
      </div>

      {expanded && history.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {history.slice().reverse().map((entry, idx) => {
            const isSelfChange = entry.changed_by === task.assigned_to;
            return (
              <div key={idx} className="flex items-start gap-2 text-[11px] bg-white/70 rounded-md px-2.5 py-1.5 border border-white">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-foreground">{entry.changed_by_name || entry.changed_by}</span>
                    {entry.changed_by_role && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                        {ROLE_LABELS[entry.changed_by_role] || entry.changed_by_role}
                      </Badge>
                    )}
                    {isSelfChange && (
                      <Badge className="text-[8px] px-1 py-0 h-3.5 bg-orange-100 text-orange-700 border-orange-300" variant="outline">
                        ผู้รับผิดชอบเอง
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    <span className="line-through text-red-500">{formatDate(entry.old_due_date)}</span>
                    {' → '}
                    <span className="font-medium text-green-700">{formatDate(entry.new_due_date)}</span>
                  </p>
                  {entry.reason && (
                    <p className="text-[10px] text-blue-600 mt-0.5">📝 {entry.reason}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateTime(entry.changed_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}