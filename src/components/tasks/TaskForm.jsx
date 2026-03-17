import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function TaskForm({ task, onSubmit, isLoading, permissions }) {
  const canEditAssignee = permissions?.canEditAssignee !== false;
  const canEditDueDate = permissions ? permissions.canChangeDueDate(task) : true;
  const canEditStatus = permissions ? permissions.canChangeStatus(task) : true;
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: '', description: '', customer_id: '', customer_name: '',
    service_type: '', assigned_to: '', assigned_name: '', department: '',
    priority: 'medium', status: 'pending', due_date: '', start_date: '',
    checklist: [], is_recurring: false, recurring_type: '', template_id: '', ...task,
  });

  const { data: allCustomers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const customers = allCustomers.filter(c => c.status === 'active');
  const { data: users = [] } = useUserList();
  const { data: templates = [] } = useQuery({ queryKey: ['taskTemplates'], queryFn: () => base44.entities.TaskTemplate.list() });
  const activeTemplates = templates.filter(t => t.status !== 'inactive');
  const [newCheckItem, setNewCheckItem] = useState('');

  const applyTemplate = (templateId) => {
    if (!templateId || templateId === '_none') {
      update('template_id', '');
      return;
    }
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    // Calculate due date from rule
    const now = new Date();
    const dueDay = tmpl.due_date_rule || 15;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, 28));
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    setForm(prev => ({
      ...prev,
      template_id: templateId,
      title: tmpl.name || prev.title,
      service_type: tmpl.service_type || prev.service_type,
      department: tmpl.department || prev.department,
      priority: tmpl.default_priority || prev.priority,
      status: tmpl.default_status || prev.status,
      due_date: dueDateStr,
      is_recurring: true,
      recurring_type: tmpl.recurring_type || prev.recurring_type,
      checklist: tmpl.default_checklist?.map(c => ({ ...c, checked: false })) || prev.checklist,
      description: tmpl.description || prev.description,
    }));
  };

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
      {/* Template Selector - only for new tasks */}
      {!task && activeTemplates.length > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1.5">
          <Label className="flex items-center gap-1.5 text-primary"><ClipboardList className="w-3.5 h-3.5" /> เลือก Task Template (สำหรับงานซ้ำประจำ)</Label>
          <Select value={form.template_id || '_none'} onValueChange={v => applyTemplate(v)}>
            <SelectTrigger className="bg-card"><SelectValue placeholder="เลือก Template..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— ไม่ใช้ Template —</SelectItem>
              {activeTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.template_code} — {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.template_id && form.template_id !== '_none' && (
            <p className="text-[10px] text-muted-foreground">Template จะตั้งค่าชื่อ, บริการ, due date, checklist ให้อัตโนมัติ</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5"><Label>{t('task_name')} *</Label><Input value={form.title} onChange={e => update('title', e.target.value)} /></div>

        <div className="space-y-1.5"><Label>{t('customer')}</Label>
          <SearchableSelect
            value={form.customer_id}
            onValueChange={v => { const c = customers.find(c => c.id === v); setForm(p => ({ ...p, customer_id: v, customer_name: c?.company_name || '' })); }}
            options={customers.map(c => ({ value: c.id, label: c.company_name }))}
            placeholder={t('select_customer')}
          />
        </div>

        <div className="space-y-1.5"><Label>{t('service_type')}</Label>
          <Select value={form.service_type} onValueChange={v => update('service_type', v)}>
            <SelectTrigger><SelectValue placeholder={t('select_service')} /></SelectTrigger>
            <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('assigned_to')}</Label>
          <SearchableSelect
            value={form.assigned_to}
            onValueChange={v => { const u = users.find(u => u.email === v); setForm(p => ({ ...p, assigned_to: v, assigned_name: u?.full_name || '' })); }}
            options={users.map(u => ({ value: u.email, label: u.full_name || u.email }))}
            placeholder={t('select_assignee')}
            disabled={!canEditAssignee && !!task}
          />
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
          <Select value={form.status} onValueChange={v => update('status', v)} disabled={!canEditStatus && !!task}>
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
        <div className="space-y-1.5"><Label>{t('due_date')}</Label><Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} disabled={!canEditDueDate && !!task} /></div>
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