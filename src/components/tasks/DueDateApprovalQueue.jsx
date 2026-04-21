import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Check, X, Clock, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

/**
 * Approval hierarchy:
 * staff → super_supervisor, manager, management, admin
 * super_supervisor → manager, management, admin
 * manager → management, admin
 * management → admin
 */
const CAN_APPROVE = {
  staff: ['super_supervisor', 'manager', 'management', 'admin'],
  super_supervisor: ['manager', 'management', 'admin'],
  manager: ['management', 'admin'],
  management: ['admin'],
};

export function canApproveDueChange(requesterRole, approverRole) {
  const allowed = CAN_APPROVE[requesterRole] || [];
  return allowed.includes(approverRole);
}

export default function DueDateApprovalQueue({ tasks, currentUser, onApprove, onReject }) {
  const [rejectDialog, setRejectDialog] = useState({ open: false, task: null });
  const [rejectNote, setRejectNote] = useState('');

  const myRole = currentUser?.role || 'staff';

  // Filter tasks with pending_due_change that I can approve
  const pendingTasks = (tasks || []).filter(t => {
    if (!t.pending_due_change) return false;
    const requesterRole = t.pending_due_change.requested_by_role || 'staff';
    // Can't approve your own request
    if (t.pending_due_change.requested_by === currentUser?.email) return false;
    return canApproveDueChange(requesterRole, myRole);
  });

  if (pendingTasks.length === 0) return null;

  const handleReject = () => {
    if (!rejectDialog.task) return;
    onReject(rejectDialog.task.id, rejectNote);
    setRejectDialog({ open: false, task: null });
    setRejectNote('');
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            คำขอเลื่อน Due Date
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">{pendingTasks.length}</Badge>
            <Link to="/Tasks" className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              ดูทั้งหมด <ChevronRight className="w-3 h-3" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingTasks.slice(0, 5).map(task => {
            const req = task.pending_due_change;
            return (
              <div key={task.id} className="bg-white rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      🏢 {task.customer_name || '-'} · 👤 {req.requested_by_name}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="w-2.5 h-2.5 mr-0.5" /> รออนุมัติ
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-muted-foreground">
                    📅 เดิม: <b>{req.old_due_date ? format(new Date(req.old_due_date + 'T00:00:00'), 'd MMM yy') : '-'}</b>
                  </span>
                  <span className="text-amber-700">
                    → ใหม่: <b>{req.new_due_date ? format(new Date(req.new_due_date + 'T00:00:00'), 'd MMM yy') : '-'}</b>
                  </span>
                </div>

                {req.reason && (
                  <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    💬 {req.reason}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 flex-1"
                    onClick={() => onApprove(task.id)}>
                    <Check className="w-3 h-3" /> อนุมัติ
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 flex-1"
                    onClick={() => { setRejectDialog({ open: true, task }); setRejectNote(''); }}>
                    <X className="w-3 h-3" /> ปฏิเสธ
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) setRejectDialog({ open: false, task: null }); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm text-red-700">ปฏิเสธคำขอเลื่อน Due Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              งาน: <b>{rejectDialog.task?.title}</b>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">เหตุผล (ไม่บังคับ)</Label>
              <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="เช่น ขอให้ทำตาม due เดิม..." rows={2} className="text-xs" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-xs h-8" onClick={handleReject}>
                ปฏิเสธ
              </Button>
              <Button variant="ghost" className="text-xs h-8" onClick={() => setRejectDialog({ open: false, task: null })}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}