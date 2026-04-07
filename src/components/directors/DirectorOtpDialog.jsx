import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Loader2, Copy, Check, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectorOtpDialog({ open, onOpenChange, director, onDecrypted }) {
  const [step, setStep] = useState('request'); // request | verify | result
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState(null);
  const [copied, setCopied] = useState('');

  const handleClose = (val) => {
    if (!val) {
      setStep('request');
      setOtp('');
      setDecrypted(null);
      setCopied('');
    }
    onOpenChange(val);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('directorManager', {
        action: 'send_otp', director_id: director.id,
      });
      toast.success('ส่ง OTP ไปยัง Email แล้ว');
      setStep('verify');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'ส่ง OTP ล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('directorManager', {
        action: 'decrypt', director_id: director.id, otp,
      });
      if (res.data.success) {
        setDecrypted(res.data);
        setStep('result');
        if (onDecrypted) onDecrypted(res.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'OTP ไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const fields = [
    { label: 'ชื่อ-นามสกุล', value: decrypted?.full_name, key: 'name', color: 'green' },
    { label: 'เลขบัตรประชาชน', value: decrypted?.id_card, key: 'id', color: 'blue' },
    { label: 'ที่อยู่', value: decrypted?.address, key: 'addr', color: 'amber' },
    { label: 'เบอร์โทร', value: decrypted?.phone, key: 'phone', color: 'purple' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> ดูข้อมูลกรรมการ
          </DialogTitle>
        </DialogHeader>

        {step === 'request' && (
          <div className="text-center py-4 space-y-4">
            <p className="text-sm text-muted-foreground">ต้องยืนยัน OTP เพื่อดูข้อมูลส่วนบุคคล</p>
            <p className="text-xs font-medium">{director?.customer_name} — {director?.position || 'กรรมการ'}</p>
            <Button onClick={handleSendOtp} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ส่ง OTP ไปยัง Email
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-center text-muted-foreground">กรอก OTP 6 หลักที่ส่งไปยัง Email</p>
            <Input
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
            <Button onClick={handleVerify} disabled={loading || otp.length !== 6} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยัน OTP'}
            </Button>
          </div>
        )}

        {step === 'result' && decrypted && (
          <div className="space-y-3 py-4">
            {fields.filter(f => f.value).map(f => (
              <div key={f.key} className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(f.key, f.value)}>
                    {copied === f.key ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <p className="font-mono text-sm font-medium">{f.value}</p>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground text-center">ข้อมูลส่วนบุคคลตาม PDPA — จะถูกซ่อนเมื่อปิดหน้าต่างนี้</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}