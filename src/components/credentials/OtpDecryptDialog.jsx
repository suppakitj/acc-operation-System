import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Send, KeyRound, Eye, Copy, Check } from 'lucide-react';

export default function OtpDecryptDialog({ open, onOpenChange, credential }) {
  const [step, setStep] = useState('request'); // request | verify | result
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState(null);
  const [copied, setCopied] = useState(null);

  const handleRequestOtp = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('credentialManager', {
      action: 'send_otp',
      credential_id: credential.id,
    });
    setLoading(false);
    if (res.data.success) {
      toast.success('ส่ง OTP ไปยัง email ของคุณแล้ว');
      setStep('verify');
    } else {
      toast.error(res.data.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('credentialManager', {
      action: 'decrypt',
      credential_id: credential.id,
      otp,
    });
    setLoading(false);
    if (res.data.success) {
      setDecrypted({ username: res.data.username, password: res.data.password });
      setStep('result');
    } else {
      toast.error(res.data.error || 'OTP ไม่ถูกต้อง');
    }
  };

  const handleCopy = (field, value) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClose = (val) => {
    if (!val) {
      setStep('request');
      setOtp('');
      setDecrypted(null);
      setCopied(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> ดู Credential
          </DialogTitle>
        </DialogHeader>

        {step === 'request' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              เพื่อความปลอดภัย ระบบจะส่ง OTP ไปยัง email ของคุณเพื่อยืนยันตัวตนก่อนแสดง password
            </p>
            <Button onClick={handleRequestOtp} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              ส่ง OTP ไปยัง Email
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">กรอกรหัส OTP 6 หลักที่ส่งไปยัง email ของคุณ</p>
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
              <Button className="flex-1" onClick={handleVerify} disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                ยืนยัน
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && decrypted && (
          <div className="space-y-3 py-4">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-green-700">Username</Label>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy('user', decrypted.username)}>
                  {copied === 'user' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <p className="font-mono text-sm font-medium">{decrypted.username}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-blue-700">Password</Label>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy('pass', decrypted.password)}>
                  {copied === 'pass' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <p className="font-mono text-sm font-medium">{decrypted.password}</p>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">ข้อมูลนี้จะถูกซ่อนเมื่อปิดหน้าต่างนี้</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}