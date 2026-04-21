import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarClock } from 'lucide-react';

export default function DueDateReasonDialog({ open, onOpenChange, oldDate, newDate, onConfirm }) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = (o) => {
    if (!o) setReason('');
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-600" />
            เหตุผลที่เลื่อน Due Date
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="text-muted-foreground">เดิม:</span>
            <span className="font-medium">{oldDate || '-'}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="text-muted-foreground">ใหม่:</span>
            <span className="font-medium text-amber-700">{newDate || '-'}</span>
          </div>
          <div className="space-y-1.5">
            <Label>เหตุผลการเลื่อน *</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="เช่น ลูกค้าส่งเอกสารไม่ทัน, งานเพิ่มขอบเขต..."
              rows={3}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>ยกเลิก</Button>
          <Button onClick={handleConfirm} disabled={!reason.trim()}>ยืนยันเลื่อน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}