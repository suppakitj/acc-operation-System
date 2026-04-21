import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { XCircle } from 'lucide-react';

export default function RejectPostponeDialog({ open, onOpenChange, onReject, isPending }) {
  const [note, setNote] = useState('');

  const handleOpen = (isOpen) => {
    if (isOpen) setNote('');
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <XCircle className="w-4 h-4 text-red-600" />
            ปฏิเสธคำขอเลื่อน
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>หมายเหตุ (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="เหตุผลที่ปฏิเสธ..." rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpen(false)}>ยกเลิก</Button>
            <Button size="sm" variant="destructive" disabled={isPending} onClick={() => onReject(note)}>
              {isPending ? 'กำลังส่ง...' : '❌ ปฏิเสธ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}