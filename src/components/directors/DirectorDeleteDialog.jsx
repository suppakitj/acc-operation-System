import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Send, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function DirectorDeleteDialog({ open, onOpenChange, director, onDeleted, isAdmin }) {
  const [step, setStep] = useState('confirm'); // confirm | reason
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin: delete directly
  const handleAdminDelete = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('directorManager', {
        action: 'delete', director_id: director.id,
      });
      toast.success('ลบข้อมูลกรรมการแล้ว');
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // Non-admin: submit request
  const handleSubmitRequest = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('directorManager', {
        action: 'request_delete',
        director_id: director.id,
        reason: reason.trim(),
      });
      if (res.data.success) {
        toast.success('ส่งคำขอลบไปให้ Admin อนุมัติแล้ว');
        onDeleted();
        onOpenChange(false);
      } else {
        toast.error(res.data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val) => {
    if (!val) { setStep('confirm'); setReason(''); setLoading(false); }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" /> ลบข้อมูลกรรมการ
          </DialogTitle>
          <DialogDescription>
            {director?.customer_name} — {director?.position || 'กรรมการ'}
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">การลบจะไม่สามารถกู้คืนได้</p>
                <p className="text-xs mt-1">ข้อมูลนี้เป็นข้อมูลส่วนบุคคลตาม PDPA</p>
                {!isAdmin && (
                  <p className="text-xs mt-1 font-medium">คำขอลบจะถูกส่งไปให้ Admin อนุมัติก่อน</p>
                )}
              </div>
            </div>
            {isAdmin ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>ยกเลิก</Button>
                <Button variant="destructive" className="flex-1" onClick={handleAdminDelete} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  ยืนยันลบ
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>ยกเลิก</Button>
                <Button variant="destructive" className="flex-1" onClick={() => setStep('reason')}>
                  ขอลบ → ส่ง Admin อนุมัติ
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'reason' && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <p>คำขอลบจะถูกส่งให้ Admin อนุมัติก่อนถึงจะลบจริง</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">เหตุผลที่ขอลบ *</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="เช่น กรรมการลาออก, ข้อมูลซ้ำ..." rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('confirm')}>กลับ</Button>
              <Button variant="destructive" className="flex-1" onClick={handleSubmitRequest} disabled={loading || !reason.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                ส่งคำขอลบ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}