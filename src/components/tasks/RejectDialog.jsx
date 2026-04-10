import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format, addDays } from 'date-fns';
import { AlertTriangle, Calendar } from 'lucide-react';

export default function RejectDialog({ open, onOpenChange, task, onConfirm }) {
  const [note, setNote] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (open && task) {
      setNote('');
      const suggested = format(addDays(new Date(), 2), 'yyyy-MM-dd');
      setNewDueDate(suggested);
    }
  }, [open, task]);

  if (!task) return null;

  const handleConfirm = () => {
    onConfirm({ note, newDueDate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" /> ส่งกลับให้แก้ไข
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              🏢 {task.customer_name || '-'} · 👤 {task.assigned_name || '-'}
            </p>
            {task.due_date && (
              <p className="text-xs text-muted-foreground mt-1">
                📅 กำหนดเดิม: {format(new Date(task.due_date + 'T00:00:00'), 'd MMM yyyy')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">เหตุผลที่ส่งกลับ</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น ตัวเลข VAT ยังไม่ตรง กรุณาตรวจสอบใหม่..."
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> กำหนดส่งใหม่
            </Label>
            <Input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              กำหนดวันที่น้องต้องแก้ไขแล้วส่งตรวจอีกครั้ง
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 gap-1.5"
              onClick={handleConfirm}
              disabled={!newDueDate}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> ส่งกลับ
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