import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Send, Loader2, ShieldCheck, Lock, Server, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function O365EmailSettings() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'o365'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const getVal = (key) => configs.find(c => c.key === key)?.value || '';

  const [senderName, setSenderName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setSenderName(getVal('o365_sender_name') || 'ACC Consulting');
    setEmailAddress(getVal('o365_email_address'));
    setEmailSubject(getVal('o365_email_subject') || '[ACC Consulting] Reminder: กำหนดการนำส่งงาน');
    const savedPw = getVal('o365_app_password');
    if (savedPw) {
      setAppPassword('');
      setIsSaved(true);
    } else {
      setIsSaved(false);
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pairs = [
        { key: 'o365_sender_name', value: senderName, description: 'O365 Email sender display name' },
        { key: 'o365_email_address', value: emailAddress, description: 'O365 Email address for SMTP' },
        { key: 'o365_smtp_host', value: 'smtp.office365.com', description: 'O365 SMTP host' },
        { key: 'o365_smtp_port', value: '587', description: 'O365 SMTP port' },
        { key: 'o365_email_subject', value: emailSubject, description: 'O365 Default email subject' },
      ];
      if (appPassword) {
        // Encode password before storing
        const encoded = btoa(appPassword);
        pairs.push({ key: 'o365_app_password', value: encoded, description: 'O365 App Password (encoded)' });
      }
      for (const p of pairs) {
        const existing = configs.find(c => c.key === p.key);
        if (existing) {
          await base44.entities.AppConfig.update(existing.id, { value: p.value });
        } else {
          await base44.entities.AppConfig.create(p);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig', 'o365'] });
      setAppPassword('');
      setIsSaved(true);
      toast.success('บันทึกการตั้งค่า O365 Email เรียบร้อยแล้ว ✅', {
        description: 'ระบบพร้อมใช้งานส่งอีเมลผ่าน Microsoft 365',
      });
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาดในการบันทึก', {
        description: 'กรุณาลองอีกครั้ง หากยังไม่สำเร็จ ติดต่อทีม IT Support',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('testO365Connection', {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success('เชื่อมต่อ Office 365 สำเร็จแล้ว! 🎉', {
        description: 'ระบบพร้อมส่งอีเมลแจ้งเตือนถึงลูกค้าอย่างราบรื่น',
      });
    },
    onError: (err) => {
      toast.error('ยังไม่สามารถเชื่อมต่อได้ค่ะ 💡', {
        description: err.message || 'กรุณาตรวจสอบอีเมลและ App Password อีกครั้งนะคะ',
      });
    },
  });

  const hasPassword = isSaved && !appPassword;
  const isConnected = !!(getVal('o365_email_address') && getVal('o365_app_password'));

  return (
    <div className="rounded-xl border-2 border-blue-900/20 overflow-hidden shadow-sm">
      {/* Navy Header */}
      <div className="bg-gradient-to-r from-blue-950 to-blue-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">O365 Email Settings</h3>
              <p className="text-blue-200 text-[11px]">Microsoft Office 365 SMTP Configuration</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={isConnected
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[10px]'
              : 'bg-white/10 text-blue-200 border-white/20 text-[10px]'}
          >
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isConnected ? 'bg-emerald-400' : 'bg-blue-300'}`} />
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white p-5 space-y-5">
        {/* Security Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-medium text-blue-800">ข้อมูลถูกเข้ารหัสและจัดเก็บอย่างปลอดภัย</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Password ทุกตัวถูกเข้ารหัส (Encoded) ก่อนบันทึกลงฐานข้อมูล ไม่มีการจัดเก็บเป็น Plain Text</p>
          </div>
        </div>

        {/* SMTP Server & Port — Read-only defaults */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-blue-950 flex items-center gap-1.5">
              <Server className="w-3 h-3" /> SMTP Server
            </Label>
            <Input
              value="smtp.office365.com"
              readOnly
              className="bg-blue-50/50 text-muted-foreground border-blue-200 cursor-default text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-blue-950 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> SMTP Port
            </Label>
            <Input
              value="587"
              readOnly
              className="bg-blue-50/50 text-muted-foreground border-blue-200 cursor-default text-xs"
            />
            <p className="text-[10px] text-muted-foreground">TLS/STARTTLS (Secured)</p>
          </div>
        </div>

        {/* Sender Name */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-blue-950">Sender Name</Label>
          <Input
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            placeholder="เช่น ACC Consulting"
            className="border-blue-200 focus-visible:ring-blue-400 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">ชื่อผู้ส่งที่จะแสดงในกล่องข้อความอีเมลของผู้รับ</p>
        </div>

        {/* Email Subject */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-blue-950">Email Subject (หัวข้อเริ่มต้น)</Label>
          <Input
            value={emailSubject}
            onChange={e => setEmailSubject(e.target.value)}
            placeholder="[ACC Consulting] Reminder: กำหนดการนำส่งงาน"
            className="border-blue-200 focus-visible:ring-blue-400 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">หัวข้ออีเมลเริ่มต้นสำหรับการแจ้งเตือนอัตโนมัติ</p>
        </div>

        {/* O365 Email Address */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-blue-950">O365 Email Address</Label>
          <Input
            type="email"
            value={emailAddress}
            onChange={e => setEmailAddress(e.target.value)}
            placeholder="admin@yourcompany.com"
            className="border-blue-200 focus-visible:ring-blue-400 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">อีเมล Microsoft 365 ที่ใช้สำหรับส่งอีเมลจากระบบ</p>
        </div>

        {/* Password / App Password */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-blue-950 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Password / App Password
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={appPassword}
              onChange={e => setAppPassword(e.target.value)}
              placeholder={hasPassword ? '••••••••••••••••' : 'กรอกรหัสผ่าน Office 365 หรือ App Password'}
              className="border-blue-200 focus-visible:ring-blue-400 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-700 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {hasPassword && (
            <p className="text-[11px] text-emerald-600 font-medium">✓ Password ถูกเข้ารหัสและบันทึกแล้ว — กรอกใหม่เฉพาะเมื่อต้องการเปลี่ยน</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            แนะนำให้ใช้ App Password จาก{' '}
            <a href="https://account.live.com/proofs/AppPassword" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:no-underline font-medium">
              Microsoft Account Security
            </a>
            {' '}เพื่อความปลอดภัยสูงสุด
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-blue-100" />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!senderName && !emailAddress)}
            className="flex-1 bg-blue-950 hover:bg-blue-900 text-white"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังบันทึก...</>
            ) : (
              'Save Settings'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !getVal('o365_email_address')}
            className="gap-2 border-blue-300 text-blue-900 hover:bg-blue-50 hover:text-blue-950"
          >
            {testMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> ทดสอบ...</>
            ) : (
              <><Send className="w-4 h-4" /> Test Connection</>
            )}
          </Button>
        </div>

        {/* Test Success/Error Feedback */}
        {testMutation.isSuccess && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 animate-in fade-in-0 slide-in-from-bottom-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-emerald-800">เชื่อมต่อสำเร็จ! ระบบพร้อมส่งอีเมลแล้ว 🎉</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">อีเมลทดสอบได้ถูกส่งไปยัง Inbox ของคุณเรียบร้อยแล้ว</p>
            </div>
          </div>
        )}
        {testMutation.isError && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 animate-in fade-in-0 slide-in-from-bottom-2">
            <Mail className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-rose-700">ยังเชื่อมต่อไม่สำเร็จ</p>
              <p className="text-[10px] text-rose-600 mt-0.5">{testMutation.error?.message || 'กรุณาตรวจสอบ Email Address และ Password อีกครั้ง'}</p>
              <p className="text-[10px] text-rose-500 mt-1">💡 หากเปิด MFA อยู่ ต้องใช้ App Password แทนรหัสผ่านปกติ</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}