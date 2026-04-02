import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Save, Loader2, Send, Eye, KeyRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CredentialForm({ open, onOpenChange, credential, customers, services, onSave, saving }) {
  // OTP flow for edit mode
  const [editStep, setEditStep] = useState('form'); // 'otp_request' | 'otp_verify' | 'form'
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [form, setForm] = useState({
    customer_id: '', customer_name: '', service_id: '', service_code: '', service_name: '',
    username: '', password: '', url: '', notes: '',
  });

  useEffect(() => {
    if (!open) return;
    if (credential) {
      // Edit mode — start OTP flow, don't show decrypted data yet
      setForm({
        customer_id: credential.customer_id || '',
        customer_name: credential.customer_name || '',
        service_id: credential.service_id || '',
        service_code: credential.service_code || '',
        service_name: credential.service_name || '',
        username: '', password: '',
        url: credential.url || '',
        notes: credential.notes || '',
      });
      setEditStep('otp_request');
      setOtp('');
    } else {
      // Create mode — go straight to form
      setForm({ customer_id: '', customer_name: '', service_id: '', service_code: '', service_name: '', username: '', password: '', url: '', notes: '' });
      setEditStep('form');
      setOtp('');
    }
  }, [credential, open]);

  const handleRequestOtp = async () => {
    setOtpLoading(true);
    try {
      const res = await base44.functions.invoke('credentialManager', {
        action: 'send_otp',
        credential_id: credential.id,
      });
      if (res.data.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key — ไปที่ Settings → เชื่อมต่อ → Credential Vault');
      } else if (res.data.success) {
        toast.success('ส่ง OTP ไปยัง email ของคุณแล้ว');
        setEditStep('otp_verify');
      } else {
        toast.error(res.data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key — ไปที่ Settings → เชื่อมต่อ → Credential Vault');
      } else {
        toast.error(data?.error || 'เกิดข้อผิดพลาดในการส่ง OTP');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpLoading(true);
    try {
      const res = await base44.functions.invoke('credentialManager', {
        action: 'decrypt',
        credential_id: credential.id,
        otp,
      });
      if (res.data.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key — ไปที่ Settings → เชื่อมต่อ → Credential Vault');
      } else if (res.data.success) {
        setForm(f => ({
          ...f,
          username: res.data.username,
          password: res.data.password,
        }));
        setEditStep('form');
        toast.success('ยืนยัน OTP สำเร็จ — แสดงข้อมูลเดิมแล้ว');
      } else {
        toast.error(res.data.error || 'OTP ไม่ถูกต้อง');
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key — ไปที่ Settings → เชื่อมต่อ → Credential Vault');
      } else {
        toast.error(data?.error || 'OTP ไม่ถูกต้องหรือหมดอายุ');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const customerOptions = (customers || []).map(c => ({ value: c.id, label: c.company_name }));
  const serviceOptions = (services || []).filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.name_th }));

  const handleCustomerChange = (val) => {
    const cust = customers.find(c => c.id === val);
    setForm(f => ({ ...f, customer_id: val, customer_name: cust?.company_name || '' }));
  };

  const handleServiceChange = (val) => {
    const svc = services.find(s => s.id === val);
    setForm(f => ({
      ...f,
      service_id: val,
      service_code: svc?.code || '',
      service_name: svc?.name_th || '',
      url: svc?.url || f.url,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, credential_id: credential?.id });
  };

  const isEditing = !!credential;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            {isEditing ? 'แก้ไข Credential' : 'เพิ่ม Credential ใหม่'}
          </DialogTitle>
        </DialogHeader>

        {/* OTP Request Step (edit mode only) */}
        {isEditing && editStep === 'otp_request' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              เพื่อความปลอดภัย ระบบจะส่ง OTP ไปยัง email ของคุณ<br />เพื่อยืนยันตัวตนก่อนแสดงข้อมูลเดิม
            </p>
            <Button onClick={handleRequestOtp} disabled={otpLoading} className="w-full">
              {otpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              ส่ง OTP ไปยัง Email
            </Button>
          </div>
        )}

        {/* OTP Verify Step (edit mode only) */}
        {isEditing && editStep === 'otp_verify' && (
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
              <Button variant="outline" className="flex-1" onClick={handleRequestOtp} disabled={otpLoading}>
                ส่ง OTP ใหม่
              </Button>
              <Button className="flex-1" onClick={handleVerifyOtp} disabled={otpLoading || otp.length !== 6}>
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                ยืนยัน
              </Button>
            </div>
          </div>
        )}

        {/* Main Form */}
        {editStep === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs">ลูกค้า *</Label>
              <SearchableSelect
                options={customerOptions}
                value={form.customer_id}
                onValueChange={handleCustomerChange}
                placeholder="เลือกลูกค้า"
              />
            </div>
            <div>
              <Label className="text-xs">ประเภทบริการ *</Label>
              <SearchableSelect
                options={serviceOptions}
                value={form.service_id}
                onValueChange={handleServiceChange}
                placeholder="เลือกบริการ"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Username *</Label>
                <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" autoComplete="off" />
              </div>
              <div>
                <Label className="text-xs">Password *</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" autoComplete="new-password" />
              </div>
            </div>
            <div>
              <Label className="text-xs">URL เว็บไซต์</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">หมายเหตุ</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={saving || !form.customer_id || !form.service_id || !form.username || !form.password}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึก
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}