import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';

/**
 * Role hierarchy for due date approval:
 * staff → super_supervisor / manager
 * super_supervisor → manager / management / admin
 * manager → management / admin
 * management → admin
 */
const APPROVER_LABEL = {
  staff: 'Super Supervisor / Manager',
  super_supervisor: 'Manager / Management / Admin',
  manager: 'Management / Admin',
  management: 'Admin',
};

export default function RequestDueDateDialog({ open, onOpenChange, task, currentUser, onSubmit, defaultNewDate }) {
  const [newDueDate, setNewDueDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open && task) {
      setNewDueDate(defaultNewDate || format(addDays(new Date(task.due_date || new Date()), 3), 'yyyy-MM-dd'));
      setReason('');
    }
  }, [open, task, defaultNewDate]);

  if (!task) return null;

  const role = currentUser?.role || 'staff';
  const approverLabel = APPROVER_LABEL[role] || 'Admin';
  const hasPending = !!task.pending_due_change;

  const handleSubmit = () => {
    if (!newDueDate || !reason.trim()) return;
    onSubmit({ newDueDate, reason });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-amber-600" />
            ขอเลื่อน Due Date
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              🏢 {task.customer_name || '-'} · 👤 {task.assigned_name || '-'}
            </p>
            {task.due_date && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">
                  📅 Due เดิม: {format(new Date(task.due_date + 'T00:00:00'), 'd MMM yyyy')}
                </Badge>
              </div>
            )}
          </div>

          {hasPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> มีคำขอเลื่อนรออนุมัติอยู่แล้ว
              </p>
              <p className="text-[10px] text-amber-600 mt-1">
                ขอเลื่อนเป็น {task.pending_due_change.new_due_date} — รอ {approverLabel} อนุมัติ
              </p>
            </div>
          )}

          {/* Approver info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-[11px] text-blue-700">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              คำขอจะถูกส่งไปให้ <b>{approverLabel}</b> อนุมัติก่อนเลื่อน due date
            </p>
          </div>

          {/* New due date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">วันกำหนดส่งใหม่ *</Label>
            <Input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">เหตุผลที่ต้องเลื่อน *</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="เช่น ลูกค้ายังส่งเอกสารไม่ครบ / มีงานเร่งอื่นแทรก..."
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 gap-1.5"
              onClick={handleSubmit}
              disabled={!newDueDate || !reason.trim() || hasPending}
            >
              <Calendar className="w-3.5 h-3.5" /> ส่งคำขอเลื่อน
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}