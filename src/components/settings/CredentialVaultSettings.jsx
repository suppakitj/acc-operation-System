import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Eye, EyeOff, Save, RefreshCw, ShieldCheck, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CredentialVaultSettings() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'credentialKey'],
    queryFn: () => base44.entities.AppConfig.filter({ key: 'credential_encryption_key' }, '-created_date', 1),
  });

  const getVal = () => configs[0]?.value || '';
  const getId = () => configs[0]?.id || null;

  const [encKey, setEncKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEncKey(getVal());
  }, [configs]);

  const isKeySet = !!getVal();

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    const array = new Uint8Array(48);
    crypto.getRandomValues(array);
    array.forEach(b => { result += chars[b % chars.length]; });
    setEncKey(result.slice(0, 48));
  };

  const copyKey = () => {
    navigator.clipboard.writeText(encKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('คัดลอก Key แล้ว — เก็บไว้ในที่ปลอดภัยด้วย');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!encKey || encKey.length < 16) throw new Error('Key ต้องมีความยาวอย่างน้อย 16 ตัวอักษร');
      const existingId = getId();
      if (existingId) {
        await base44.entities.AppConfig.update(existingId, { value: encKey });
      } else {
        await base44.entities.AppConfig.create({ key: 'credential_encryption_key', value: encKey, description: 'Credential Vault Encryption Key (AES-256-GCM)' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig', 'credentialKey'] });
      toast.success('บันทึก Encryption Key แล้ว');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-500" />
          Credential Vault — Encryption Key
          {isKeySet ? (
            <Badge className="bg-green-100 text-green-700 text-[10px] ml-auto border-0">
              <ShieldCheck className="w-3 h-3 mr-1" /> ตั้งค่าแล้ว
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 text-[10px] ml-auto border-0">
              <AlertTriangle className="w-3 h-3 mr-1" /> ยังไม่ได้ตั้งค่า
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isKeySet && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            ยังไม่ได้ตั้งค่า Encryption Key — ระบบ Credential Vault จะใช้งานไม่ได้จนกว่าจะบันทึก Key
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Encryption Key <span className="text-red-500">*</span></Label>
          <div className="flex items-center gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={encKey}
              onChange={e => setEncKey(e.target.value)}
              placeholder="กด 'สุ่ม Key ใหม่' เพื่อสร้างอัตโนมัติ"
              className="font-mono text-sm flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)} title={showKey ? 'ซ่อน' : 'แสดง'}>
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={copyKey} title="คัดลอก" disabled={!encKey}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">ความยาวขั้นต่ำ 16 ตัวอักษร — แนะนำ 48 ตัวอักษรขึ้นไป</p>
        </div>

        <Button variant="outline" size="sm" onClick={generateKey} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          สุ่ม Key ใหม่ (48 ตัวอักษร)
        </Button>

        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          <p className="font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> สำคัญมาก — อ่านก่อนบันทึก
          </p>
          <ul className="space-y-1 pl-4 list-disc">
            <li>Key นี้ใช้เข้ารหัส Username/Password ทุก credential ในระบบ</li>
            <li>ถ้าเปลี่ยน Key ใหม่ — credential ที่บันทึกไว้แล้วจะอ่านไม่ได้ (decrypt ไม่ออก)</li>
            <li>ควรบันทึก Key นี้ไว้ในที่ปลอดภัยแยกต่างหาก เช่น Password Manager</li>
            <li>ถ้าจะเปลี่ยน Key — ต้อง re-enter credential ทั้งหมดใหม่</li>
          </ul>
        </div>

        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !encKey || encKey.length < 16}
          className="gap-1.5"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก Encryption Key'}
        </Button>
      </CardContent>
    </Card>
  );
}