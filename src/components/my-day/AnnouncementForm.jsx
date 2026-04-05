import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AnnouncementForm({ open, onOpenChange, currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info',
    pinned: false,
    expires_at: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('สร้างข่าวสารเรียบร้อย');
      onOpenChange(false);
      setForm({ title: '', content: '', type: 'info', pinned: false, expires_at: '' });
    },
  });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    createMutation.mutate({
      ...form,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>สร้างข่าวสารบริษัท</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>หัวข้อ *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="หัวข้อข่าวสาร" />
          </div>
          <div className="space-y-1.5">
            <Label>เนื้อหา *</Label>
            <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="รายละเอียด..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ประเภท</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ข่าวสาร</SelectItem>
                  <SelectItem value="celebration">🎉 ฉลอง</SelectItem>
                  <SelectItem value="reminder">แจ้งเตือน</SelectItem>
                  <SelectItem value="urgent">ด่วน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>หมดอายุ</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.pinned} onCheckedChange={v => setForm(p => ({ ...p, pinned: v }))} />
            <Label>📌 ปักหมุด</Label>
          </div>
          <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'กำลังบันทึก...' : 'สร้างข่าวสาร'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}