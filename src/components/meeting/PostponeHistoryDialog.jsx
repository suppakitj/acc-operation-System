import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const DECISION_CONFIG = {
  auto_approved: { label: 'อนุมัติอัตโนมัติ', icon: Zap, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'อนุมัติ', icon: CheckCircle2, color: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'ปฏิเสธ', icon: XCircle, color: 'bg-red-50 text-red-700 border-red-200' },
};

function fmtDate(d) {
  if (!d) return '—';
  return format(new Date(d), 'd MMM yy', { locale: th });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return format(new Date(d), 'd MMM yy HH:mm', { locale: th });
}

export default function PostponeHistoryDialog({ open, onOpenChange, item }) {
  const history = [...(item.postpone_history || [])].reverse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-indigo-600" />
            ประวัติการเลื่อน Due Date
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1 shrink-0">
          <p className="text-xs truncate font-medium">{item.text}</p>
          <div className="flex flex-wrap gap-3 text-[11px]">
            <span><span className="text-muted-foreground">Due เดิม:</span> {fmtDate(item.original_due_date)}</span>
            <span><span className="text-muted-foreground">Due ปัจจุบัน:</span> <span className="font-semibold">{fmtDate(item.due_date)}</span></span>
            <Badge variant="outline" className="text-[9px]">เลื่อน {item.postpone_count || 0} ครั้ง</Badge>
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto space-y-3 mt-2">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">ยังไม่มีประวัติ</p>
          ) : history.map((evt, idx) => {
            const cfg = DECISION_CONFIG[evt.decision] || DECISION_CONFIG.approved;
            const Icon = cfg.icon;
            return (
              <div key={idx} className="border rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{evt.requested_by_name || evt.requested_by || '—'}</span>
                  <Badge variant="outline" className={`text-[9px] gap-1 ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtDate(evt.old_due_date)} → <span className="font-semibold text-foreground">{fmtDate(evt.new_due_date)}</span>
                </div>
                {evt.reason && <p className="text-[11px] bg-muted/50 rounded px-2 py-1">{evt.reason}</p>}
                {evt.decision === 'rejected' && evt.decision_note && (
                  <p className="text-[11px] bg-red-50 text-red-700 rounded px-2 py-1">❌ {evt.decision_note}</p>
                )}
                <div className="text-[10px] text-muted-foreground">
                  ขอ: {fmtDateTime(evt.requested_at)}
                  {evt.decision !== 'auto_approved' && evt.decided_by_name && (
                    <> · ตัดสิน: {evt.decided_by_name} ({fmtDateTime(evt.decided_at)})</>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}