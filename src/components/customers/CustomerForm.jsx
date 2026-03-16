import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '../LanguageContext';

export default function CustomerForm({ customer, onSubmit, isLoading }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    company_name: '', company_name_en: '', tax_id: '', address: '',
    contact_person: '', contact_email: '', contact_phone: '', line_id: '',
    services: [], peak_package: 'none', peak_license_start: '', peak_license_end: '',
    status: 'active', notes: '', ...customer,
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleService = (svc) => {
    const list = form.services || [];
    update('services', list.includes(svc) ? list.filter(s => s !== svc) : [...list, svc]);
  };

  const services = [
    { value: 'accounting', label: t('svc_accounting_full') },
    { value: 'payroll', label: t('svc_payroll_full') },
    { value: 'tax_consulting', label: t('svc_tax_full') },
    { value: 'audit', label: t('svc_audit_full') },
    { value: 'peak_licensing', label: t('svc_peak_full') },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>{t('company_name_th')} *</Label><Input value={form.company_name} onChange={e => update('company_name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('company_name_en')}</Label><Input value={form.company_name_en} onChange={e => update('company_name_en', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('tax_id')}</Label><Input value={form.tax_id} onChange={e => update('tax_id', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('status')}</Label>
          <Select value={form.status} onValueChange={v => update('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t('status_active')}</SelectItem>
              <SelectItem value="inactive">{t('status_inactive')}</SelectItem>
              <SelectItem value="suspended">{t('status_suspended')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5"><Label>{t('address')}</Label><Textarea value={form.address} onChange={e => update('address', e.target.value)} rows={2} /></div>
        <div className="space-y-1.5"><Label>{t('contact_person')}</Label><Input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('email')}</Label><Input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('phone')}</Label><Input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Line ID</Label><Input value={form.line_id} onChange={e => update('line_id', e.target.value)} /></div>
      </div>

      <div className="space-y-3"><Label>{t('services_used')}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {services.map(s => (
            <div key={s.value} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox checked={(form.services || []).includes(s.value)} onCheckedChange={() => toggleService(s.value)} />
              <span className="text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {(form.services || []).includes('peak_licensing') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-lg">
          <div className="space-y-1.5"><Label>Peak Package</Label>
            <Select value={form.peak_package} onValueChange={v => update('peak_package', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="pro_plus">Pro Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t('peak_start')}</Label><Input type="date" value={form.peak_license_start} onChange={e => update('peak_license_start', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t('peak_end')}</Label><Input type="date" value={form.peak_license_end} onChange={e => update('peak_license_end', e.target.value)} /></div>
        </div>
      )}

      <div className="space-y-1.5"><Label>{t('notes')}</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} /></div>

      <Button onClick={() => onSubmit(form)} disabled={isLoading || !form.company_name} className="w-full">
        {isLoading ? t('saving') : (customer ? t('update') : t('add_customer'))}
      </Button>
    </div>
  );
}