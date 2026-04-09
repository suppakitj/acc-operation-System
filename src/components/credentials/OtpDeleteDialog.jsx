import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Send, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function OtpDeleteDialog({ open, onOpenChange, credential, onDeleted, isAdmin }) {
  // Admin: confirm → OTP → delete directly
  // Non-admin: confirm + reason → request_delete (pending admin approval)
  const [step, setStep] = useState('confirm'); // confirm | otp_verify | reason
  const [otp, setOtp] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('credentialManager', {
        action: 'send_otp',
        credential_id: credential.id,
      });
      if (res.data.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key — ไปที่ Settings → เชื่อมต่อ → Credential Vault');
        onOpenChange(false);
      } else if (res.data.success) {
        toast.success('ส่ง OTP ไปยัง email ของคุณแล้ว');
        setStep('otp_verify');
      } else {
        toast.error(res.data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key');
        onOpenChange(false);
      } else {
        toast.error(data?.error || 'เกิดข้อผิดพลาดในการส่ง OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndDelete = async () => {
    setLoading(true);
    try {
      // Verify OTP first
      const verifyRes = await base44.functions.invoke('credentialManager', {
        action: 'decrypt',
        credential_id: credential.id,
        otp,
      });
      if (verifyRes.data.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key');
        onOpenChange(false);
        return;
      }
      if (!verifyRes.data.success) {
        toast.error(verifyRes.data.error || 'OTP ไม่ถูกต้อง');
        return;
      }
      // OTP verified — admin can delete directly
      await base44.functions.invoke('credentialManager', {
        action: 'delete',
        credential_id: credential.id,
      });
      toast.success('ลบ Credential เรียบร้อย');
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      const data = err?.response?.data;
      toast.error(data?.error || 'OTP ไม่ถูกต้องหรือหมดอายุ');
    } finally {
      setLoading(false);
    }
  };

  // Non-admin: submit delete request
  const handleSubmitRequest = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('credentialManager', {
        action: 'request_delete',
        credential_id: credential.id,
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
    if (!val) {
      setStep('confirm');
      setOtp('');
      setReason('');
      setLoading(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" /> ลบ Credential
          </DialogTitle>
          <DialogDescription>
            {credential?.customer_name} — {credential?.service_name || credential?.service_code}
          </DialogDescription>
        </DialogHeader>

        {/* ─── Step 1: Confirm ─── */}
        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">การลบจะไม่สามารถกู้คืนได้</p>
                {isAdmin ? (
                  <p className="text-xs mt-1">ระบบจะส่ง OTP ไปยัง email ของคุณเพื่อยืนยันการลบ</p>
                ) : (
                  <p className="text-xs mt-1">คำขอลบจะถูกส่งไปให้ Admin อนุมัติก่อน</p>
                )}
              </div>
            </div>

            {isAdmin ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleRequestOtp} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  ส่ง OTP เพื่อยืนยัน
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setStep('reason')}>
                  ขอลบ → ส่ง Admin อนุมัติ
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step: Reason (non-admin) ─── */}
        {step === 'reason' && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <p>คำขอลบจะถูกส่งให้ Admin อนุมัติก่อนถึงจะลบจริง</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">เหตุผลที่ขอลบ *</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="เช่น ลูกค้ายกเลิกสัญญา, ข้อมูลซ้ำ..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('confirm')}>
                กลับ
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleSubmitRequest} disabled={loading || !reason.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                ส่งคำขอลบ
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: OTP verify (admin only) ─── */}
        {step === 'otp_verify' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">กรอกรหัส OTP 6 หลักเพื่อยืนยันการลบ</p>
            <div>
              <Label className="text-xs">OTP Code</Label>
              <Input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleRequestOtp} disabled={loading}>
                ส่ง OTP ใหม่
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleVerifyAndDelete} disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                ยืนยันลบ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}