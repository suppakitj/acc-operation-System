import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ServiceBadge from '../components/shared/ServiceBadge';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';

export default function TaskTemplates() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [newItem, setNewItem] = useState('');
  const queryClient = useQueryClient();

  const { data: allTemplates = [] } = useQuery({ queryKey: ['taskTemplates'], queryFn: () => base44.entities.TaskTemplate.list() });
  // Full access or dept-only
  const templates = ac.canManageTemplates ? allTemplates : ac.filterByDepartment(allTemplates);
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taskTemplates'] }); setShowForm(false); },
  });

  const addChecklist = () => { if (!newItem.trim()) return; setForm(p => ({ ...p, default_checklist: [...(p.default_checklist || []), { item: newItem, checked: false }] })); setNewItem(''); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('templates_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('templates_subtitle')}</p>
        </div>
        {(ac.canManageTemplates || ac.canManageTemplatesDept) && (
          <Button onClick={() => { setForm({ recurring_type: 'none', default_priority: 'medium' }); setShowForm(true); }} className="gap-2 shrink-0 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> {t('create_template')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {templates.map(tmpl => (
          <Card key={tmpl.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><ClipboardList className="w-5 h-5 text-primary" /></div>
                <div className="min-w-0"><p className="font-semibold text-sm">{tmpl.name}</p><p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {tmpl.service_type && <ServiceBadge service={tmpl.service_type} />}
                {tmpl.recurring_type && tmpl.recurring_type !== 'none' && <Badge variant="outline">{t(`recurring_${tmpl.recurring_type}`)}</Badge>}
              </div>
              {tmpl.default_checklist?.length > 0 && <p className="text-xs text-muted-foreground mt-2">{t('checklist')}: {tmpl.default_checklist.length} {t('items')}</p>}
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">{t('no_templates')}</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('create_template')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{t('template_name')} *</Label><Input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{t('description')}</Label><Textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{t('service_type')}</Label>
                <Select value={form.service_type || ''} onValueChange={v => setForm(p => ({ ...p, service_type: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('select_service')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accounting">{t('service_accounting')}</SelectItem>
                    <SelectItem value="payroll">{t('service_payroll')}</SelectItem>
                    <SelectItem value="tax_consulting">{t('service_tax')}</SelectItem>
                    <SelectItem value="audit">{t('service_audit')}</SelectItem>
                    <SelectItem value="peak_licensing">{t('service_peak')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{t('recurring')}</Label>
                <Select value={form.recurring_type || 'none'} onValueChange={v => setForm(p => ({ ...p, recurring_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('recurring_none')}</SelectItem>
                    <SelectItem value="monthly">{t('recurring_monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('recurring_quarterly')}</SelectItem>
                    <SelectItem value="yearly">{t('recurring_yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('checklist')}</Label>
              {(form.default_checklist || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">• {item.item}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setForm(p => ({ ...p, default_checklist: p.default_checklist.filter((_, idx) => idx !== i) }))}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              <div className="flex gap-2"><Input placeholder={t('add_item')} value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} /><Button variant="outline" size="icon" onClick={addChecklist}><Plus className="w-4 h-4" /></Button></div>
            </div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending} className="w-full">{createMutation.isPending ? t('saving') : t('create_template')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}