import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Palette, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const THEMES = [
  { id: 'default', label: 'Navy Blue (ค่าเริ่มต้น)', color: 'bg-[#1e3a5f]' },
  { id: 'emerald', label: 'Emerald Green', color: 'bg-[#2d8a6e]' },
  { id: 'purple', label: 'Royal Purple', color: 'bg-[#6d28d9]' },
  { id: 'rose', label: 'Rose Red', color: 'bg-[#e11d48]' },
  { id: 'dark', label: 'Dark Mode', color: 'bg-[#1a1a2e]' },
];

export default function AppSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [selectedTheme, setSelectedTheme] = useState(user?.theme || 'default');
  const [notifEmail, setNotifEmail] = useState(user?.notification_email !== false);
  const [notifLine, setNotifLine] = useState(user?.notification_line !== false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      theme: selectedTheme,
      notification_email: notifEmail,
      notification_line: notifLine,
    });

    // Apply theme immediately
    document.documentElement.classList.remove('theme-emerald', 'theme-purple', 'theme-rose', 'dark');
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (selectedTheme !== 'default') {
      document.documentElement.classList.add(`theme-${selectedTheme}`);
    }

    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    toast.success('บันทึกการตั้งค่าแล้ว');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground mt-1">ตั้งค่าส่วนตัวและธีม</p>
      </div>

      {/* Theme Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> เลือกธีมสี
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                  selectedTheme === theme.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn("w-8 h-8 rounded-full", theme.color)} />
                <span className="text-sm font-medium">{theme.label}</span>
                {selectedTheme === theme.id && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">การแจ้งเตือน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>แจ้งเตือนทาง Email</Label>
              <p className="text-xs text-muted-foreground">รับการแจ้งเตือน due date ผ่าน Gmail / Microsoft 365</p>
            </div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>แจ้งเตือนทาง Line OA</Label>
              <p className="text-xs text-muted-foreground">รับการแจ้งเตือนผ่าน Line Official Account</p>
            </div>
            <Switch checked={notifLine} onCheckedChange={setNotifLine} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
      </Button>
    </div>
  );
}