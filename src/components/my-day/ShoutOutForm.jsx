import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

const CATEGORIES = [
  { key: 'teamwork', label: 'ทีมเวิร์ค', emoji: '🤝' },
  { key: 'quality', label: 'คุณภาพ', emoji: '⭐' },
  { key: 'speed', label: 'รวดเร็ว', emoji: '⚡' },
  { key: 'creative', label: 'ความคิดสร้างสรรค์', emoji: '💡' },
  { key: 'helpful', label: 'ช่วยเหลือ', emoji: '💪' },
  { key: 'leadership', label: 'ภาวะผู้นำ', emoji: '👑' },
];

const DEPT_LABELS = {
  management: 'Management', accounting: 'Accounting', consulting: 'Consulting',
  audit: 'Audit', billing: 'Billing', it: 'IT',
};

export default function ShoutOutForm({ open, onOpenChange, currentUser }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: users = [] } = useUserList();

  const [toEmail, setToEmail] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const { data: recentCompletedTasks = [] } = useQuery({
    queryKey: ['recentCompletedTasks'],
    queryFn: () => base44.entities.Task.filter({ status: 'completed' }, '-completed_date', 50),
    staleTime: 120_000,
  });

  const eligibleUsers = users.filter(u =>
    u.email !== currentUser?.email && u.user_status !== 'inactive'
  );

  const createShoutOut = useMutation({
    mutationFn: (data) => base44.entities.ShoutOut.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentShoutOuts'] });
      queryClient.invalidateQueries({ queryKey: ['myShoutOuts'] });
      toast.success(t('my_day_shoutout_success') + ' 🎉');
      onOpenChange(false);
      setToEmail('');
      setSelectedCategory('');
      setMessage('');
      setSelectedTaskId('');
    },
  });

  const handleSubmit = () => {
    const selectedUser = users.find(u => u.email === toEmail);
    const selectedTask = selectedTaskId ? recentCompletedTasks.find(t => t.id === selectedTaskId) : null;

    createShoutOut.mutate({
      from_email: currentUser.email,
      from_name: currentUser.full_name || currentUser.email,
      to_email: toEmail,
      to_name: selectedUser?.full_name || toEmail,
      message: message.trim(),
      category: selectedCategory,
      task_id: selectedTask?.id || '',
      task_title: selectedTask?.title || '',
    });
  };

  const canSubmit = toEmail && message.trim().length > 0 && selectedCategory;
  const remaining = 200 - message.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🌟 {t('my_day_shoutout_btn')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* To */}
          <div className="space-y-1.5">
            <Label>{t('my_day_shoutout_to')} *</Label>
            <Select value={toEmail} onValueChange={setToEmail}>
              <SelectTrigger><SelectValue placeholder="เลือกเพื่อนร่วมงาน..." /></SelectTrigger>
              <SelectContent>
                {eligibleUsers.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.full_name} {u.department ? `(${DEPT_LABELS[u.department] || u.department})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>{t('my_day_shoutout_category')} *</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`border rounded-lg p-2 text-center cursor-pointer transition-all ${
                    selectedCategory === cat.key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-xl block">{cat.emoji}</span>
                  <span className="text-[10px] font-medium mt-0.5 block">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t('my_day_shoutout_message')} *</Label>
              <span className={`text-[10px] ${remaining < 20 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {remaining}
              </span>
            </div>
            <Textarea
              value={message}
              onChange={e => { if (e.target.value.length <= 200) setMessage(e.target.value); }}
              placeholder="เขียนชมเชยสั้นๆ..."
              rows={3}
            />
          </div>

          {/* Related task (optional) */}
          <div className="space-y-1.5">
            <Label>{t('my_day_shoutout_task')}</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger><SelectValue placeholder="ไม่ระบุ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่ระบุ</SelectItem>
                {recentCompletedTasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}{task.customer_name ? ` — ${task.customer_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createShoutOut.isPending}
            className="w-full"
          >
            {createShoutOut.isPending ? 'กำลังส่ง...' : `🌟 ${t('my_day_shoutout_submit')}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}