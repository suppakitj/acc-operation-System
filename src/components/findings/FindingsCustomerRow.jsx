import React from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SEVERITY_CONFIG = {
  critical: { label: 'ร้ายแรง', emoji: '🔴', color: 'text-red-700 bg-red-50 border-red-200', dotColor: '#dc2626' },
  medium:   { label: 'ปานกลาง', emoji: '🟡', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dotColor: '#d97706' },
  low:      { label: 'เล็กน้อย', emoji: '🟢', color: 'text-green-700 bg-green-50 border-green-200', dotColor: '#16a34a' },
};

export default function FindingsCustomerRow({ data: c, isExpanded, onToggle, severityFilter }) {
  const needsMeeting = c.critical >= 3;
  const fmtDate = (d) => d ? format(parseISO(d), 'd MMM yy', { locale: th }) : '-';

  return (
    <div>
      <button onClick={onToggle} className="w-full text-left hover:bg-muted/30 transition-colors">
        {/* Desktop */}
        <div className="hidden md:grid grid-cols-[2fr_80px_80px_80px_60px_100px_110px] gap-2 px-4 py-3 items-center">
          <div className="flex items-center gap-2 min-w-0">
            {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
            <span className="text-sm font-medium truncate">{c.customerName}</span>
            {needsMeeting && <Badge className="bg-red-600 text-white text-[9px] px-1.5 shrink-0 hover:bg-red-700">⚠️ ต้องนัดประชุม</Badge>}
          </div>
          <span className="text-center text-sm font-bold text-red-700">{c.critical || '-'}</span>
          <span className="text-center text-sm font-bold text-yellow-700">{c.medium || '-'}</span>
          <span className="text-center text-sm font-bold text-green-700">{c.low || '-'}</span>
          <span className="text-center text-sm font-bold">{c.total}</span>
          <span className="text-center text-xs text-muted-foreground">{fmtDate(c.lastVisitDate)}</span>
          <div className="text-center">
            {needsMeeting
              ? <Badge variant="destructive" className="text-[10px]">⚠️ ต้องนัดประชุม</Badge>
              : <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">✅ ปกติ</Badge>}
          </div>
        </div>
        {/* Mobile */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
            <span className="text-sm font-medium truncate flex-1">{c.customerName}</span>
            {needsMeeting && <Badge className="bg-red-600 text-white text-[9px] px-1.5 shrink-0">⚠️</Badge>}
          </div>
          <div className="flex items-center gap-3 ml-6 text-xs">
            <span className="text-red-700 font-semibold">🔴 {c.critical}</span>
            <span className="text-yellow-700 font-semibold">🟡 {c.medium}</span>
            <span className="text-green-700 font-semibold">🟢 {c.low}</span>
            <span className="text-muted-foreground ml-auto">{fmtDate(c.lastVisitDate)}</span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-muted/20 border-t px-4 py-3">
          <div className="space-y-3">
            {c.tasks
              .sort((a, b) => (b.completed_date || b.due_date || b.created_date || '').localeCompare(a.completed_date || a.due_date || a.created_date || ''))
              .map(task => (
                <div key={task.id} className="bg-card rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        👤 {task.assigned_name || 'ไม่ระบุ'} · {fmtDate(task.completed_date || task.due_date)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0 ml-2">
                      {task.status === 'completed' ? '✅ เสร็จ' : task.status === 'in_progress' ? '🔄 กำลังทำ' : task.status || 'pending'}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {(task.findings || []).map((f, i) => {
                      const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.medium;
                      if (severityFilter === 'critical' && f.severity !== 'critical') return null;
                      if (severityFilter === 'medium' && f.severity === 'low') return null;
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-background border" style={{ borderLeftWidth: 3, borderLeftColor: sev.dotColor }}>
                          <Badge variant="outline" className={`text-[9px] px-1.5 shrink-0 ${sev.color}`}>{sev.emoji} {sev.label}</Badge>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{f.title}</span>
                            {f.description && <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>}
                            {f.recommendation && <p className="text-[11px] text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1">💡 {f.recommendation}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}