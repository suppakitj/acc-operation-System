import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const DEFAULT_SETTINGS = {
  reminder_days: [30, 15, 7],
  notify_time: '09:30',
  channels: ['email'],
};

export default function PeakNotificationSettings({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'peak_notification_settings'],
    queryFn: () => base44.entities.AppConfig.filter({ key: 'peak_notification_settings' }),
  });

  const existing = configs.find(c => c.key === 'peak_notification_settings');
  const saved = existing?.value ? (() => { try { return JSON.parse(existing.value); } catch { return null; } })() : null;

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [newDay, setNewDay] = useState('');

  useEffect(() => {
    if (open && saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
    else if (open) setSettings(DEFAULT_SETTINGS);
  }, [open, saved]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const val = JSON.stringify(settings);
      if (existing) {
        await base44.entities.AppConfig.update(existing.id, { value: val });
      } else {
        await base44.entities.AppConfig.create({ key: 'peak_notification_settings', value: val, description: 'Peak license notification settings' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig', 'peak_notification_settings'] });
      toast.success('บันทึกการตั้งค่าแจ้งเตือนเรียบร้อย');
      onOpenChange(false);
    },
  });

  const addDay = () => {
    const d = parseInt(newDay);
    if (!d || d < 1) return;
    if (!settings.reminder_days.includes(d)) {
      setSettings(prev => ({ ...prev, reminder_days: [...prev.reminder_days, d].sort((a, b) => b - a) }));
    }
    setNewDay('');
  };

  const removeDay = (d) => setSettings(prev => ({ ...prev, reminder_days: prev.reminder_days.filter(v => v !== d) }));

  const toggleChannel = (ch) => {
    setSettings(prev => ({
      ...prev,
      channels: prev.channels.includes(ch) ? prev.channels.filter(c => c !== ch) : [...prev.channels, ch],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>ตั้งค่าการแจ้งเตือน Peak License</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>แจ้งเตือนก่อนหมดอายุ (วัน)</Label>
            <div className="flex flex-wrap gap-2">
              {settings.reminder_days.map(d => (
                <div key={d} className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium">
                  {d} วัน
                  <button onClick={() => removeDay(d)} className="ml-1 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input type="number" min={1} placeholder="เพิ่มจำนวนวัน..." value={newDay} onChange={e => setNewDay(e.target.value)} className="w-40"
                onKeyDown={e => e.key === 'Enter' && addDay()} />
              <Button variant="outline" size="sm" onClick={addDay}>เพิ่ม</Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>เวลาส่งแจ้งเตือน</Label>
            <Input type="time" value={settings.notify_time || '09:30'} onChange={e => setSettings(prev => ({ ...prev, notify_time: e.target.value }))} className="w-32" />
          </div>

          <div className="space-y-2">
            <Label>ช่องทางการแจ้งเตือน</Label>
            <div className="space-y-1.5">
              {[
                { key: 'email', label: 'อีเมล (O365 / Gmail)' },
                { key: 'line', label: 'LINE' },
              ].map(ch => (
                <div key={ch.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox checked={settings.channels.includes(ch.key)} onCheckedChange={() => toggleChannel(ch.key)} />
                  <span className="text-xs">{ch.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}