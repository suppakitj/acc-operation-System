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
import { useLanguage } from '../LanguageContext';

const SERVICES = [
  { value: 'accounting', label: 'รับทำบัญชี' },
  { value: 'payroll', label: 'รับทำเงินเดือน' },
  { value: 'tax_consulting', label: 'ที่ปรึกษาภาษีรายเดือน' },
  { value: 'audit', label: 'งานตรวจสอบบัญชี' },
  { value: 'peak_licensing', label: 'Licensing Peak Account' },
];

const DEPARTMENTS = [
  { value: 'management', label: 'Management' },
  { value: 'accounting', label: 'บัญชี' },
  { value: 'consulting', label: 'ที่ปรึกษา' },
  { value: 'audit', label: 'Audit' },
  { value: 'billing', label: 'Billing' },
  { value: 'it', label: 'IT' },
];

const CUSTOMER_GROUPS = [
  { value: 'individual', label: 'บุคคลธรรมดา' },
  { value: 'sme', label: 'SME' },
  { value: 'corporate', label: 'บริษัท/นิติบุคคล' },
  { value: 'government', label: 'หน่วยงานราชการ' },
  { value: 'other', label: 'อื่นๆ' },
];

const WORK_GROUPS = [
  { value: 'group_a', label: 'Group A' },
  { value: 'group_b', label: 'Group B' },
  { value: 'group_c', label: 'Group C' },
  { value: 'group_d', label: 'Group D' },
];

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'โอนเงิน' },
  { value: 'cash', label: 'เงินสด' },
  { value: 'cheque', label: 'เช็ค' },
  { value: 'credit_card', label: 'บัตรเครดิต' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function CustomerForm({ customer, onSubmit, isLoading, readOnly }) {
  const { t } = useLanguage();
  const { data: users = [] } = useUserList();

  const [form, setForm] = useState({
    company_name: '', company_name_en: '', tax_id: '', address: '',
    customer_group: 'sme', work_group: '', departments: [],
    supervisor: '', supervisor_name: '', primary_officer: '', primary_officer_name: '',
    contact_person: '', contact_email: '', contact_phone: '', line_id: '',
    services: [], peak_package: 'none', peak_license_start: '', peak_license_end: '',
    credit_term: 30, billing_profile: { billing_name: '', billing_address: '', billing_tax_id: '', billing_email: '', payment_method: 'transfer' },
    status: 'active', notes: '',
    ...customer,
    billing_profile: { billing_name: '', billing_address: '', billing_tax_id: '', billing_email: '', payment_method: 'transfer', ...(customer?.billing_profile || {}) },
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updateBilling = (key, value) => setForm(prev => ({ ...prev, billing_profile: { ...prev.billing_profile, [key]: value } }));

  const toggleArr = (field, val) => {
    const list = form[field] || [];
    update(field, list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  };

  const setUserField = (emailField, nameField, email) => {
    const u = users.find(u => u.email === email);
    setForm(prev => ({ ...prev, [emailField]: email, [nameField]: u?.full_name || '' }));
  };

  const handleSubmit = () => {
    if (!form.company_name) return;
    // Validate TAX ID
    if (form.tax_id && form.tax_id.replace(/\D/g, '').length !== 13 && form.tax_id.length > 0) {
      // Allow empty, but if filled must be 13 digits
    }
    onSubmit(form);
  };

  return (
    <div className="space-y-5">
      {/* Section: ข้อมูลบริษัท */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">ข้อมูลบริษัท</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {customer?.customer_code && (
            <div className="space-y-1"><Label>รหัสลูกค้า</Label><Input value={form.customer_code || ''} disabled className="bg-muted" /></div>
          )}
          <div className="space-y-1"><Label>ชื่อลูกค้า *</Label><Input value={form.company_name} onChange={e => update('company_name', e.target.value)} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>ชื่อ (อังกฤษ)</Label><Input value={form.company_name_en} onChange={e => update('company_name_en', e.target.value)} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>TAX ID (13 หลัก)</Label><Input value={form.tax_id} onChange={e => update('tax_id', e.target.value)} maxLength={13} placeholder="0000000000000" disabled={readOnly} /></div>
          <div className="space-y-1"><Label>สถานะ</Label>
            <Select value={form.status} onValueChange={v => update('status', v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1"><Label>ที่อยู่</Label><Textarea value={form.address} onChange={e => update('address', e.target.value)} rows={2} disabled={readOnly} /></div>
        </div>
      </div>

      {/* Section: การจำแนก */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">การจำแนก</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>กลุ่มลูกค้า</Label>
            <Select value={form.customer_group} onValueChange={v => update('customer_group', v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CUSTOMER_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>กลุ่มงาน</Label>
            <Select value={form.work_group || '_none'} onValueChange={v => update('work_group', v === '_none' ? '' : v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— ไม่ระบุ —</SelectItem>
                {WORK_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <Label>แผนกรับผิดชอบ (เลือกได้หลายแผนก)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEPARTMENTS.map(d => (
              <div key={d.value} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox checked={(form.departments || []).includes(d.value)} onCheckedChange={() => !readOnly && toggleArr('departments', d.value)} disabled={readOnly} />
                <span className="text-xs">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section: ผู้รับผิดชอบ */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">ผู้รับผิดชอบ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>หัวหน้าดูแล</Label>
            <SearchableSelect
              value={form.supervisor || '_none'}
              onValueChange={v => v === '_none' ? setForm(p => ({...p, supervisor: '', supervisor_name: ''})) : setUserField('supervisor', 'supervisor_name', v)}
              options={[{ value: '_none', label: '— ไม่ระบุ —' }, ...users.filter(u => u.role !== 'staff').map(u => ({ value: u.email, label: `${u.full_name} (${u.email})` }))]}
              placeholder="เลือกหัวหน้า"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1"><Label>เจ้าหน้าที่หลัก</Label>
            <SearchableSelect
              value={form.primary_officer || '_none'}
              onValueChange={v => v === '_none' ? setForm(p => ({...p, primary_officer: '', primary_officer_name: ''})) : setUserField('primary_officer', 'primary_officer_name', v)}
              options={[{ value: '_none', label: '— ไม่ระบุ —' }, ...users.map(u => ({ value: u.email, label: `${u.full_name} (${u.email})` }))]}
              placeholder="เลือกเจ้าหน้าที่"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Section: ข้อมูลติดต่อ */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">ข้อมูลติดต่อ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>ผู้ติดต่อ</Label><Input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>อีเมล</Label><Input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>เบอร์โทร</Label><Input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>Line ID</Label><Input value={form.line_id} onChange={e => update('line_id', e.target.value)} disabled={readOnly} /></div>
          <div className="md:col-span-2 space-y-1">
            <Label>LINE Group ID</Label>
            <Input value={form.line_group_id || ''} onChange={e => update('line_group_id', e.target.value)} placeholder="C..." disabled={readOnly} />
            <p className="text-[11px] text-muted-foreground">Group ID ของกลุ่ม LINE สำหรับส่งแจ้งเตือนเข้ากลุ่มลูกค้า</p>
          </div>
        </div>
      </div>

      {/* Section: ประเภทบริการ */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">ประเภทบริการ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICES.map(s => (
            <div key={s.value} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox checked={(form.services || []).includes(s.value)} onCheckedChange={() => !readOnly && toggleArr('services', s.value)} disabled={readOnly} />
              <span className="text-xs">{s.label}</span>
            </div>
          ))}
        </div>
        {(form.services || []).includes('peak_licensing') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 bg-muted/40 rounded-lg">
            <div className="space-y-1"><Label>Peak Package</Label>
              <Select value={form.peak_package} onValueChange={v => update('peak_package', v)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="pro_plus">Pro Plus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>เริ่ม License</Label><Input type="date" value={form.peak_license_start} onChange={e => update('peak_license_start', e.target.value)} disabled={readOnly} /></div>
            <div className="space-y-1"><Label>หมดอายุ License</Label><Input type="date" value={form.peak_license_end} onChange={e => update('peak_license_end', e.target.value)} disabled={readOnly} /></div>
          </div>
        )}
      </div>

      {/* Section: Billing Profile */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">Billing Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Credit Term (วัน)</Label><Input type="number" min={0} value={form.credit_term || ''} onChange={e => update('credit_term', parseInt(e.target.value) || 0)} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>วิธีชำระเงิน</Label>
            <Select value={form.billing_profile?.payment_method || 'transfer'} onValueChange={v => updateBilling('payment_method', v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>ชื่อสำหรับออกบิล</Label><Input value={form.billing_profile?.billing_name || ''} onChange={e => updateBilling('billing_name', e.target.value)} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>อีเมลส่งบิล</Label><Input type="email" value={form.billing_profile?.billing_email || ''} onChange={e => updateBilling('billing_email', e.target.value)} disabled={readOnly} /></div>
          <div className="md:col-span-2 space-y-1"><Label>ที่อยู่ออกบิล</Label><Textarea value={form.billing_profile?.billing_address || ''} onChange={e => updateBilling('billing_address', e.target.value)} rows={2} disabled={readOnly} /></div>
          <div className="space-y-1"><Label>TAX ID สำหรับออกบิล</Label><Input value={form.billing_profile?.billing_tax_id || ''} onChange={e => updateBilling('billing_tax_id', e.target.value)} disabled={readOnly} /></div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1"><Label>หมายเหตุ</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} disabled={readOnly} /></div>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isLoading || !form.company_name} className="w-full">
          {isLoading ? t('saving') : (customer ? t('update') : t('add_customer'))}
        </Button>
      )}
    </div>
  );
}