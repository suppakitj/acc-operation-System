import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, Loader2 } from 'lucide-react';

export default function RejectDialog({ open, onOpenChange, onReject, saving }) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onReject(reason);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) setReason(''); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> ส่งกลับแก้ไข
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">เหตุผล *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="กรุณาระบุสิ่งที่ต้องแก้ไข..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={!reason.trim() || saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              ส่งกลับ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}