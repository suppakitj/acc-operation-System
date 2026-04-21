import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function PostponeDialog({ open, onOpenChange, item, isAutoApprover, onSubmit, isPending }) {
  const [newDueDate, setNewDueDate] = useState('');
  const [reason, setReason] = useState('');

  const handleOpen = (isOpen) => {
    if (isOpen) {
      setNewDueDate('');
      setReason('');
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    if (!newDueDate || !reason.trim()) return;
    if (newDueDate === item.due_date) return;
    onSubmit({ newDueDate, reason: reason.trim() });
  };

  const originalDiffers = item.original_due_date && item.original_due_date !== item.due_date;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-amber-600" />
            ขอเลื่อน Due Date
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs truncate"><span className="text-muted-foreground">งาน:</span> {item.text}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">Due ปัจจุบัน:</span>
              <span className="font-semibold">
                {item.due_date ? format(new Date(item.due_date), 'd MMM yy', { locale: th }) : '—'}
              </span>
            </div>
            {originalDiffers && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">Due เดิม:</span>
                <span>{format(new Date(item.original_due_date), 'd MMM yy', { locale: th })}</span>
              </div>
            )}
            {item.postpone_count > 0 && (
              <Badge variant="outline" className={`text-[9px] ${item.postpone_count >= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                เลื่อนมาแล้ว {item.postpone_count} ครั้ง
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>วันใหม่ที่ต้องการ *</Label>
            <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>เหตุผล *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="อธิบายเหตุผลที่ต้องเลื่อน..." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleOpen(false)}>ยกเลิก</Button>
            <Button
              size="sm"
              disabled={!newDueDate || !reason.trim() || newDueDate === item.due_date || isPending}
              onClick={handleSubmit}
              className={isAutoApprover ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {isPending ? 'กำลังส่ง...' : isAutoApprover ? '⏰ เลื่อนทันที' : '📩 ส่งคำขอ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}