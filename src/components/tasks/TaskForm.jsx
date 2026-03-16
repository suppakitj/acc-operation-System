import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function TaskForm({ task, onSubmit, isLoading }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: '', description: '', customer_id: '', customer_name: '',
    service_type: '', assigned_to: '', assigned_name: '', department: '',
    priority: 'medium', status: 'pending', due_date: '', start_date: '',
    checklist: [], is_recurring: false, recurring_type: '', ...task,
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const [newCheckItem, setNewCheckItem] = useState('');

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const addChecklistItem = () => { if (!newCheckItem.trim()) return; update('checklist', [...(form.checklist || []), { item: newCheckItem, checked: false }]); setNewCheckItem(''); };
  const removeChecklistItem = (idx) => update('checklist', form.checklist.filter((_, i) => i !== idx));
  const toggleChecklistItem = (idx) => { const u = [...form.checklist]; u[idx] = { ...u[idx], checked: !u[idx].checked }; update('checklist', u); };

  const services = [
    { value: 'accounting', label: t('service_accounting') }, { value: 'payroll', label: t('service_payroll') },
    { value: 'tax_consulting', label: t('service_tax') }, { value: 'audit', label: t('service_audit') },
    { value: 'peak_licensing', label: t('service_peak') },
  ];

  const departments = [
    { value: 'management', label: t('dept_management') }, { value: 'accounting', label: t('dept_accounting') },
    { value: 'consulting', label: t('dept_consulting') }, { value: 'audit', label: t('dept_audit') },
    { value: 'billing', label: t('dept_billing') }, { value: 'it', label: t('dept_it') },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5"><Label>{t('task_name')} *</Label><Input value={form.title} onChange={e => update('title', e.target.value)} /></div>

        <div className="space-y-1.5"><Label>{t('customer')}</Label>
          <Select value={form.customer_id} onValueChange={v => { const c = customers.find(c => c.id === v); setForm(p => ({ ...p, customer_id: v, customer_name: c?.company_name || '' })); }}>
            <SelectTrigger><SelectValue placeholder={t('select_customer')} /></SelectTrigger>
            <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('service_type')}</Label>
          <Select value={form.service_type} onValueChange={v => update('service_type', v)}>
            <SelectTrigger><SelectValue placeholder={t('select_service')} /></SelectTrigger>
            <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('assigned_to')}</Label>
          <Select value={form.assigned_to} onValueChange={v => { const u = users.find(u => u.email === v); setForm(p => ({ ...p, assigned_to: v, assigned_name: u?.full_name || '' })); }}>
            <SelectTrigger><SelectValue placeholder={t('select_assignee')} /></SelectTrigger>
            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('department')}</Label>
          <Select value={form.department} onValueChange={v => update('department', v)}>
            <SelectTrigger><SelectValue placeholder={t('select_department')} /></SelectTrigger>
            <SelectContent>{departments.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('priority')}</Label>
          <Select value={form.priority} onValueChange={v => update('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('priority_low')}</SelectItem>
              <SelectItem value="medium">{t('priority_medium')}</SelectItem>
              <SelectItem value="high">{t('priority_high')}</SelectItem>
              <SelectItem value="urgent">{t('priority_urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('status')}</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t('status_pending')}</SelectItem>
              <SelectItem value="in_progress">{t('status_in_progress')}</SelectItem>
              <SelectItem value="review">{t('status_review')}</SelectItem>
              <SelectItem value="completed">{t('status_completed')}</SelectItem>
              <SelectItem value="cancelled">{t('status_cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('start_date')}</Label><Input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('due_date')}</Label><Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} /></div>
        <div className="md:col-span-2 space-y-1.5"><Label>{t('description')}</Label><Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
      </div>

      <div className="space-y-3">
        <Label>{t('checklist')}</Label>
        <div className="space-y-2">
          {form.checklist?.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox checked={item.checked} onCheckedChange={() => toggleChecklistItem(i)} />
              <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>{item.item}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeChecklistItem(i)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder={t('add_item')} value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistItem()} />
            <Button variant="outline" size="icon" onClick={addChecklistItem}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <Button onClick={() => onSubmit(form)} disabled={isLoading || !form.title} className="w-full">
        {isLoading ? t('saving') : (task ? t('update') : t('create'))}
      </Button>
    </div>
  );
}