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
import { Building2, Users, Phone, Briefcase, CreditCard, FileText, UserCheck, MessageSquare, ClipboardCheck } from 'lucide-react';
import CustomerLineGroups from './CustomerLineGroups';

const SERVICES = [
  { value: 'accounting', label: 'รับทำบัญชี' },
  { value: 'payroll', label: 'รับทำเงินเดือน' },
  { value: 'tax_consulting', label: 'ที่ปรึกษาภาษีรายเดือน' },
  { value: 'audit', label: 'งานตรวจสอบบัญชี' },
  { value: 'peak_licensing', label: 'Licensing Peak Account' },
];

const OBLIGATIONS = [
  { value: 'pnd1_monthly', label: 'ภงด.1 รายเดือน', desc: 'ภาษีเงินได้หัก ณ ที่จ่าย (เงินเดือน) ยื่นภายในวันที่ 7 ของเดือนถัดไป' },
  { value: 'pnd1k_yearly', label: 'ภงด.1ก สิ้นปี', desc: 'สรุปยอดเงินได้พนักงานทั้งปี ยื่นภายใน ก.พ.' },
  { value: 'pnd3_monthly', label: 'ภงด.3 รายเดือน', desc: 'หัก ณ ที่จ่าย บุคคลธรรมดา ยื่นภายในวันที่ 7' },
  { value: 'pnd53_monthly', label: 'ภงด.53 รายเดือน', desc: 'หัก ณ ที่จ่าย นิติบุคคล ยื่นภายในวันที่ 7' },
  { value: 'pnd54_monthly', label: 'ภงด.54 รายเดือน', desc: 'ภาษีเงินได้หัก ณ ที่จ่าย (จ่ายไปต่างประเทศ) ยื่นออนไลน์ภายในวันที่ 15 ของเดือนถัดไป' },
  { value: 'pp30_monthly', label: 'ภ.พ.30 รายเดือน', desc: 'ยื่น VAT ภายในวันที่ 15 ของเดือนถัดไป' },
  { value: 'pp36_monthly', label: 'ภ.พ.36 รายเดือน', desc: 'นำส่งภาษีมูลค่าเพิ่ม ยื่นออนไลน์ภายในวันที่ 15 ของเดือนถัดไป' },
  { value: 'sso_monthly', label: 'ประกันสังคม รายเดือน', desc: 'ยื่นภายในวันที่ 15 ของเดือนถัดไป' },
  { value: 'pnd90_director', label: 'ภงด.90 กรรมการ', desc: 'ภาษีบุคคลธรรมดา (มีรายได้อื่น) ยื่นภายใน มี.ค.' },
  { value: 'pnd91_director', label: 'ภงด.91 กรรมการ', desc: 'ภาษีบุคคลธรรมดา (เงินเดือนอย่างเดียว) ยื่นภายใน มี.ค.' },
  { value: 'pnd50_half', label: 'ภงด.50 ครึ่งปี', desc: 'ภาษีนิติบุคคลครึ่งปี ยื่นภายใน 2 เดือนหลังครบ 6 เดือน' },
  { value: 'pnd51_half', label: 'ภงด.51 ครึ่งปี', desc: 'ภาษีนิติบุคคลครึ่งปี (แบบประมาณการ) ยื่นภายใน 2 เดือนหลังครบ 6 เดือนของรอบบัญชี' },
  { value: 'pnd50_annual', label: 'ภงด.50 ประจำปี', desc: 'ภาษีนิติบุคคลประจำปี ยื่นภายใน 150 วันหลังสิ้นรอบบัญชี' },
  { value: 'audit_annual', label: 'ตรวจสอบงบการเงิน', desc: 'ปีละครั้ง' },
  { value: 'dbd_filing', label: 'ยื่นงบ กรมพัฒนาธุรกิจ', desc: 'ภายใน 5 เดือนหลังสิ้นรอบบัญชี' },
  { value: 'disclosure_form', label: 'Disclosure Form', desc: 'แบบนำส่งงบการเงิน (สบช.3) ยื่นภายใน 150 วันหลังสิ้นรอบบัญชี พร้อมกับ ภงด.50' },
  { value: 'boj5_annual', label: 'บอจ.5 บัญชีรายชื่อผู้ถือหุ้น', desc: 'ยื่นภายใน 14 วันหลังประชุมผู้ถือหุ้น (ประชุมภายใน 4 เดือนหลังสิ้นรอบบัญชี)' },
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

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-4 border-b border-border">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function FieldWrapper({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export default function CustomerForm({ customer, onSubmit, isLoading, readOnly }) {
  const { t } = useLanguage();
  const { data: users = [] } = useUserList();
  const { data: referrers = [] } = useQuery({ queryKey: ['referrers'], queryFn: () => base44.entities.Referrer.filter({ status: 'active' }), staleTime: 60_000 });
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    company_name: '', company_name_en: '', tax_id: '', address: '',
    customer_group: 'sme', work_group: '', departments: [],
    supervisor: '', supervisor_name: '', primary_officer: '', primary_officer_name: '',
    contact_person: '', contact_email: '', contact_phone: '', line_id: '',
    services: [], obligations: [], fiscal_year_end: '12-31', peak_package: 'none', peak_license_start: '', peak_license_end: '',
    credit_term: 30, monthly_fee: null, yearly_fee: null,
    billing_profile: { billing_name: '', billing_address: '', billing_tax_id: '', billing_email: '', payment_method: 'transfer' },
    status: 'active', notes: '',
    ...customer,
    billing_profile: { billing_name: '', billing_address: '', billing_tax_id: '', billing_email: '', payment_method: 'transfer', ...(customer?.billing_profile || {}) },
  });

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };
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
    const newErrors = {};
    if (!form.company_name.trim()) newErrors.company_name = 'กรุณากรอกชื่อลูกค้า';
    const digits = (form.tax_id || '').replace(/\D/g, '');
    if (digits.length !== 13) newErrors.tax_id = 'กรุณากรอก TAX ID ให้ครบ 13 หลัก';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit(form);
  };

  return (
    <div className="space-y-6">
      {/* Section: ข้อมูลบริษัท */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={Building2} title="ข้อมูลบริษัท" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customer?.customer_code && (
            <FieldWrapper label="รหัสลูกค้า">
              <Input value={form.customer_code || ''} disabled className="bg-muted" />
            </FieldWrapper>
          )}
          <FieldWrapper label="ชื่อลูกค้า" required error={errors.company_name}>
            <Input value={form.company_name} onChange={e => update('company_name', e.target.value)} disabled={readOnly} className={errors.company_name ? 'border-destructive' : ''} />
          </FieldWrapper>
          <FieldWrapper label="ชื่อ (อังกฤษ)">
            <Input value={form.company_name_en} onChange={e => update('company_name_en', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="TAX ID (13 หลัก)" required error={errors.tax_id}>
            <Input value={form.tax_id} onChange={e => update('tax_id', e.target.value.replace(/\D/g, ''))} maxLength={13} placeholder="0000000000000" disabled={readOnly} className={errors.tax_id ? 'border-destructive' : ''} />
          </FieldWrapper>
          <FieldWrapper label="เลขสาขา">
            <Input value={form.branch_code || ''} onChange={e => update('branch_code', e.target.value.replace(/\D/g, ''))} maxLength={5} placeholder="00000 = สำนักงานใหญ่" disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="สถานะ">
            <Select value={form.status} onValueChange={v => update('status', v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FieldWrapper>
          <div className="md:col-span-2">
            <FieldWrapper label="ที่อยู่">
              <Textarea value={form.address} onChange={e => update('address', e.target.value)} rows={2} disabled={readOnly} />
            </FieldWrapper>
          </div>
        </div>
      </div>

      {/* Section: การจำแนก */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={FileText} title="การจำแนก" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper label="กลุ่มลูกค้า">
            <Select value={form.customer_group} onValueChange={v => update('customer_group', v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CUSTOMER_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </FieldWrapper>
          <FieldWrapper label="กลุ่มงาน">
            <Select value={form.work_group || '_none'} onValueChange={v => update('work_group', v === '_none' ? '' : v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— ไม่ระบุ —</SelectItem>
                {WORK_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWrapper>
        </div>
        <div className="mt-4">
          <Label className="text-xs font-medium">แผนกรับผิดชอบ (เลือกได้หลายแผนก)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {DEPARTMENTS.map(d => (
              <div key={d.value} className="flex items-center gap-2 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-pointer" onClick={() => !readOnly && toggleArr('departments', d.value)}>
                <Checkbox checked={(form.departments || []).includes(d.value)} disabled={readOnly} />
                <span className="text-xs font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section: ผู้รับผิดชอบ */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={Users} title="ผู้รับผิดชอบ" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper label="หัวหน้าดูแล">
            <SearchableSelect
              value={form.supervisor || '_none'}
              onValueChange={v => v === '_none' ? setForm(p => ({...p, supervisor: '', supervisor_name: ''})) : setUserField('supervisor', 'supervisor_name', v)}
              options={[{ value: '_none', label: '— ไม่ระบุ —' }, ...users.filter(u => u.role !== 'staff').map(u => ({ value: u.email, label: `${u.full_name} (${u.email})` }))]}
              placeholder="เลือกหัวหน้า"
              disabled={readOnly}
            />
          </FieldWrapper>
          <FieldWrapper label="เจ้าหน้าที่หลัก">
            <SearchableSelect
              value={form.primary_officer || '_none'}
              onValueChange={v => v === '_none' ? setForm(p => ({...p, primary_officer: '', primary_officer_name: ''})) : setUserField('primary_officer', 'primary_officer_name', v)}
              options={[{ value: '_none', label: '— ไม่ระบุ —' }, ...users.map(u => ({ value: u.email, label: `${u.full_name} (${u.email})` }))]}
              placeholder="เลือกเจ้าหน้าที่"
              disabled={readOnly}
            />
          </FieldWrapper>
        </div>
      </div>

      {/* Section: ข้อมูลติดต่อ */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={Phone} title="ข้อมูลติดต่อ" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper label="ผู้ติดต่อ">
            <Input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="อีเมล">
            <Input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="เบอร์โทร">
            <Input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="Line ID">
            <Input value={form.line_id} onChange={e => update('line_id', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
        </div>
      </div>

      {/* Section: กลุ่ม LINE */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={MessageSquare} title="กลุ่ม LINE" />
        <CustomerLineGroups customerId={customer?.id} readOnly={readOnly} />
      </div>

      {/* Section: ประเภทบริการ */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={Briefcase} title="ประเภทบริการ" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICES.map(s => (
            <div key={s.value} className="flex items-center gap-2 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-pointer" onClick={() => !readOnly && toggleArr('services', s.value)}>
              <Checkbox checked={(form.services || []).includes(s.value)} disabled={readOnly} />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
          ))}
        </div>
        {(form.services || []).includes('peak_licensing') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 p-4 bg-muted/40 rounded-lg border border-dashed">
            <FieldWrapper label="Peak Package">
              <Select value={form.peak_package} onValueChange={v => update('peak_package', v)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="pro_plus">Pro Plus</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrapper>
            <FieldWrapper label="เริ่ม License">
              <Input type="date" value={form.peak_license_start} onChange={e => update('peak_license_start', e.target.value)} disabled={readOnly} />
            </FieldWrapper>
            <FieldWrapper label="หมดอายุ License">
              <Input type="date" value={form.peak_license_end} onChange={e => update('peak_license_end', e.target.value)} disabled={readOnly} />
            </FieldWrapper>
          </div>
        )}
      </div>

      {/* Section: ภาระผูกพัน */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={ClipboardCheck} title="ภาระผูกพัน (Obligations)" />
        <p className="text-xs text-muted-foreground mb-3">เลือกภาระที่ ACC ต้องดำเนินการให้ลูกค้ารายนี้</p>
        <div className="mb-4">
          <FieldWrapper label="วันสิ้นรอบบัญชี">
            <Select value={form.fiscal_year_end || '12-31'} onValueChange={v => update('fiscal_year_end', v)} disabled={readOnly}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12-31">31 ธันวาคม (default)</SelectItem>
                <SelectItem value="03-31">31 มีนาคม</SelectItem>
                <SelectItem value="06-30">30 มิถุนายน</SelectItem>
                <SelectItem value="09-30">30 กันยายน</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">ลูกค้า 99% สิ้นรอบ 31 ธ.ค. — เปลี่ยนเฉพาะรายที่ต่างจากปกติ</p>
          </FieldWrapper>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OBLIGATIONS.map(ob => (
            <div
              key={ob.value}
              className="flex items-start gap-2 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-pointer"
              onClick={() => !readOnly && toggleArr('obligations', ob.value)}
            >
              <Checkbox
                checked={(form.obligations || []).includes(ob.value)}
                disabled={readOnly}
                className="mt-0.5"
              />
              <div>
                <span className="text-xs font-medium">{ob.label}</span>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{ob.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Billing Profile */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={CreditCard} title="Billing Profile" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FieldWrapper label="Credit Term (วัน)">
            <Input type="number" min={0} value={form.credit_term || ''} onChange={e => update('credit_term', parseInt(e.target.value) || 0)} disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="Monthly Fee (THB)">
            <Input type="number" min={0} step="0.01" value={form.monthly_fee ?? ''} onChange={e => update('monthly_fee', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="Yearly Fee (THB)">
            <Input type="number" min={0} step="0.01" value={form.yearly_fee ?? ''} onChange={e => update('yearly_fee', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" disabled={readOnly} />
          </FieldWrapper>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed">
          <FieldWrapper label="วิธีชำระเงิน">
            <Select value={form.billing_profile?.payment_method || 'transfer'} onValueChange={v => updateBilling('payment_method', v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </FieldWrapper>
          <FieldWrapper label="ชื่อสำหรับออกบิล">
            <Input value={form.billing_profile?.billing_name || ''} onChange={e => updateBilling('billing_name', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="อีเมลส่งบิล">
            <Input type="email" value={form.billing_profile?.billing_email || ''} onChange={e => updateBilling('billing_email', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
          <FieldWrapper label="TAX ID สำหรับออกบิล">
            <Input value={form.billing_profile?.billing_tax_id || ''} onChange={e => updateBilling('billing_tax_id', e.target.value)} disabled={readOnly} />
          </FieldWrapper>
          <div className="md:col-span-2">
            <FieldWrapper label="ที่อยู่ออกบิล">
              <Textarea value={form.billing_profile?.billing_address || ''} onChange={e => updateBilling('billing_address', e.target.value)} rows={2} disabled={readOnly} />
            </FieldWrapper>
          </div>
        </div>
      </div>

      {/* Section: ผู้แนะนำ */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <SectionHeader icon={UserCheck} title="ผู้แนะนำ (Referral)" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper label="ผู้แนะนำ">
            <SearchableSelect
              value={form.referrer_id || '_none'}
              onValueChange={v => {
                if (v === '_none') {
                  setForm(p => ({ ...p, referrer_id: '', referrer_name: '', referral_commission_pct: null }));
                } else {
                  const ref = referrers.find(r => r.id === v);
                  setForm(p => ({ ...p, referrer_id: v, referrer_name: ref?.name || '' }));
                }
              }}
              options={[{ value: '_none', label: '— ไม่มีผู้แนะนำ —' }, ...referrers.map(r => ({ value: r.id, label: `${r.name}${r.phone ? ` (${r.phone})` : ''}` }))]}
              placeholder="เลือกผู้แนะนำ"
              disabled={readOnly}
            />
          </FieldWrapper>
          <FieldWrapper label="% ค่าแนะนำ">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={form.referral_commission_pct ?? ''}
              onChange={e => update('referral_commission_pct', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="เช่น 5 = 5%"
              disabled={readOnly || !form.referrer_id}
            />
          </FieldWrapper>
        </div>
        {form.referrer_name && (
          <p className="text-xs text-muted-foreground mt-2">ผู้แนะนำ: <span className="font-medium text-foreground">{form.referrer_name}</span> {form.referral_commission_pct ? `— ค่าแนะนำ ${form.referral_commission_pct}%` : ''}</p>
        )}
      </div>

      {/* Notes */}
      <div className="bg-card rounded-xl border p-4 md:p-5">
        <FieldWrapper label="หมายเหตุ">
          <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} disabled={readOnly} />
        </FieldWrapper>
      </div>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isLoading || !form.company_name} className="w-full h-11 text-sm font-semibold">
          {isLoading ? t('saving') : (customer ? t('update') : t('add_customer'))}
        </Button>
      )}
    </div>
  );
}