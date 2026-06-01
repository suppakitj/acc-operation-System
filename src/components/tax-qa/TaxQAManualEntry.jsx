import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, Loader2, FileEdit } from 'lucide-react';
import { toast } from 'sonner';

const MANUAL_FORM_TYPES = [
  { value: 'PND54', label: 'ภ.ง.ด.54' },
  { value: 'PP36', label: 'ภ.พ.36' },
];

const emptyLine = () => ({
  payee_name: '', payee_tax_id: '', income_desc: '',
  wht_rate: '', tax_base: '', wht_amount: '', pay_date: '', branch: '00000',
});

export default function TaxQAManualEntry({ onSaveComplete }) {
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [taxPeriod, setTaxPeriod] = useState('');
  const [formType, setFormType] = useState('PND54');
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['taxqa_customers_manual'],
    queryFn: () => base44.entities.Customer.filter({ status: 'active' }, 'company_name', 500),
  });

  const periodOptions = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periodOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    setCustomerName(customers.find(c => c.id === id)?.company_name || '');
  };

  const updateLine = (idx, field, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!customerId || !taxPeriod || !formType) {
      toast.error('กรุณาเลือกลูกค้า, งวดภาษี และประเภทแบบ');
      return;
    }
    const validLines = lines.filter(l => l.payee_name && l.tax_base);
    if (validLines.length === 0) {
      toast.error('กรุณากรอกรายการอย่างน้อย 1 รายการ');
      return;
    }

    setSaving(true);
    const user = await base44.auth.me();

    // Find TaxDeadline
    let taxDeadlineId = '';
    const [year, month] = taxPeriod.split('-');
    const taxType = formType === 'PND54' ? 'pnd54' : 'pp36';
    const deadlines = await base44.entities.TaxDeadline.filter({
      tax_type: taxType, for_year: parseInt(year), for_month: parseInt(month)
    }, '-created_date', 1);
    if (deadlines.length > 0) taxDeadlineId = deadlines[0].id;

    // Create batch
    const batch = await base44.entities.TaxQA_IngestionBatch.create({
      source_filename: `manual_${formType}_${taxPeriod}`,
      customer_id: customerId, customer_name: customerName,
      tax_period: taxPeriod, form_type: formType, detected_layout: 'manual',
      parsed_count: validLines.length, status: 'parsed',
      imported_by: user.email, imported_by_name: user.full_name || '',
    });

    // Create Filing
    const totalTax = validLines.reduce((s, l) => s + (parseFloat(l.wht_amount) || 0), 0);
    const filing = await base44.entities.TaxQA_Filing.create({
      customer_id: customerId, customer_name: customerName,
      form_type: formType, tax_period: taxPeriod,
      tax_deadline_id: taxDeadlineId,
      status: 'validating',
      header_total_tax: Math.round(totalTax * 100) / 100,
      source_batch_id: batch.id,
      prepared_by: user.email, prepared_by_name: user.full_name || '',
      line_count: validLines.length,
    });

    // Create LineItems
    const items = validLines.map((l, i) => ({
      filing_id: filing.id, seq_in_file: i + 1,
      payee_name: l.payee_name, payee_tax_id: l.payee_tax_id,
      income_desc: l.income_desc, wht_rate: parseFloat(l.wht_rate) || 0,
      tax_base: parseFloat(l.tax_base) || 0, wht_amount: parseFloat(l.wht_amount) || 0,
      pay_date: l.pay_date, branch: l.branch,
      pnd_type: formType === 'PND54' ? 'ภ.ง.ด. 54' : 'ภ.พ.36',
    }));
    await base44.entities.TaxQA_LineItem.bulkCreate(items);

    setSaving(false);
    toast.success(`บันทึก ${formType} สำเร็จ: ${validLines.length} รายการ`);
    setLines([emptyLine()]);
    onSaveComplete?.({ filing_id: filing.id, batch_id: batch.id, parsed_count: validLines.length });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileEdit className="w-5 h-5" />
          กรอกมือ ภ.ง.ด.54 / ภ.พ.36
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">ลูกค้า *</label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger><SelectValue placeholder="เลือกลูกค้า" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">งวดภาษี *</label>
            <Select value={taxPeriod} onValueChange={setTaxPeriod}>
              <SelectTrigger><SelectValue placeholder="YYYY-MM" /></SelectTrigger>
              <SelectContent>
                {periodOptions.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">ประเภทแบบ *</label>
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MANUAL_FORM_TYPES.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-3">
          <div className="text-sm font-medium">รายการ</div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border rounded-lg bg-muted/30">
              <Input placeholder="ชื่อผู้รับเงิน *" value={line.payee_name} onChange={e => updateLine(idx, 'payee_name', e.target.value)} />
              <Input placeholder="เลขภาษี 13 หลัก" value={line.payee_tax_id} onChange={e => updateLine(idx, 'payee_tax_id', e.target.value)} />
              <Input placeholder="ประเภทเงินได้" value={line.income_desc} onChange={e => updateLine(idx, 'income_desc', e.target.value)} />
              <Input placeholder="วันที่จ่าย DD/MM/YYYY" value={line.pay_date} onChange={e => updateLine(idx, 'pay_date', e.target.value)} />
              <Input type="number" placeholder="อัตราภาษี (%)" value={line.wht_rate} onChange={e => updateLine(idx, 'wht_rate', e.target.value)} />
              <Input type="number" placeholder="จำนวนเงินที่จ่าย *" value={line.tax_base} onChange={e => updateLine(idx, 'tax_base', e.target.value)} />
              <Input type="number" placeholder="ภาษีหัก ณ ที่จ่าย" value={line.wht_amount} onChange={e => updateLine(idx, 'wht_amount', e.target.value)} />
              <div className="flex items-center gap-2">
                <Input placeholder="สาขา" value={line.branch} onChange={e => updateLine(idx, 'branch', e.target.value)} />
                {lines.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} className="shrink-0 text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
            <Plus className="w-4 h-4" /> เพิ่มรายการ
          </Button>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </CardContent>
    </Card>
  );
}