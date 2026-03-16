import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Eye, EyeOff, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CONFIG_KEYS = ['smtp_sender_name', 'smtp_gmail_address', 'smtp_app_password'];

export default function EmailSettings() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'email'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const getVal = (key) => configs.find(c => c.key === key)?.value || '';

  const [senderName, setSenderName] = useState('');
  const [gmailAddress, setGmailAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setSenderName(getVal('smtp_sender_name'));
    setGmailAddress(getVal('smtp_gmail_address'));
    // If password exists, show placeholder
    const savedPw = getVal('smtp_app_password');
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
        { key: 'smtp_sender_name', value: senderName, description: 'Email sender display name' },
        { key: 'smtp_gmail_address', value: gmailAddress, description: 'Gmail address for SMTP' },
      ];
      // Only update password if user typed a new one
      if (appPassword) {
        pairs.push({ key: 'smtp_app_password', value: appPassword, description: 'Gmail App Password (16 digits)' });
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
      queryClient.invalidateQueries({ queryKey: ['appConfig', 'email'] });
      setAppPassword('');
      setIsSaved(true);
      toast.success('บันทึกการตั้งค่าอีเมลเรียบร้อยแล้ว');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('testEmailConnection', {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success('เชื่อมต่อ Gmail สำเร็จแล้ว! ระบบพร้อมส่งข้อมูลถึงลูกค้าอย่างราบรื่น ✉️');
    },
    onError: (err) => {
      toast.error(err.message || 'ไม่สามารถเชื่อมต่อได้ รบกวนตรวจสอบอีเมลหรือ App Password อีกครั้งนะครับ');
    },
  });

  const hasPassword = isSaved && !appPassword;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-500" /> Email Settings (Gmail SMTP)
        </CardTitle>
        <p className="text-xs text-muted-foreground">ตั้งค่าการส่งอีเมลของระบบผ่าน Gmail SMTP</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sender Name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Sender Name</Label>
          <Input
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            placeholder="เช่น ACC Consulting"
          />
          <p className="text-[11px] text-muted-foreground">ชื่อผู้ส่งที่จะแสดงในอีเมลที่ลูกค้าได้รับ</p>
        </div>

        {/* Gmail Address */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Gmail Address</Label>
          <Input
            type="email"
            value={gmailAddress}
            onChange={e => setGmailAddress(e.target.value)}
            placeholder="example@gmail.com"
          />
          <p className="text-[11px] text-muted-foreground">อีเมล Gmail ที่ใช้สำหรับส่งอีเมลจากระบบ</p>
        </div>

        {/* App Password */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">App Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={appPassword}
              onChange={e => setAppPassword(e.target.value)}
              placeholder={hasPassword ? '••••••••••••••••' : 'รหัสผ่านแอป 16 หลัก'}
              maxLength={16}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {hasPassword && (
            <p className="text-[11px] text-green-600">✓ App Password ถูกบันทึกแล้ว — กรอกใหม่เฉพาะเมื่อต้องการเปลี่ยน</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            เพื่อความปลอดภัยสูงสุด กรุณาใช้ App Password ที่สร้างจากหน้า{' '}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
              Google Account Security
            </a>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!senderName && !gmailAddress)}
            className="flex-1"
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
            disabled={testMutation.isPending || !getVal('smtp_gmail_address')}
            className="gap-2"
          >
            {testMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> กำลังทดสอบ...</>
            ) : (
              <><Send className="w-4 h-4" /> Test Connection</>
            )}
          </Button>
        </div>

        {/* Error display */}
        {testMutation.isError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            ❌ {testMutation.error?.message || 'ไม่สามารถเชื่อมต่อได้ รบกวนตรวจสอบอีเมลหรือ App Password อีกครั้งนะครับ'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}