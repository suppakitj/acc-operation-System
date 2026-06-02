import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const FORM_TYPES = [
  { value: 'PND3', label: 'ภ.ง.ด.3' },
  { value: 'PND53', label: 'ภ.ง.ด.53' },
  { value: 'PP30', label: 'ภ.พ.30 (ภาษีซื้อ/ขาย)' },
];

export default function TaxQAUploadForm({ onParseComplete }) {
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [taxPeriod, setTaxPeriod] = useState('');
  const [formType, setFormType] = useState('');
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['taxqa_customers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'active' }, 'company_name', 500),
  });

  // Generate period options (last 24 months)
  const periodOptions = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    periodOptions.push({ value: val, label });
  }

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const c = customers.find(c => c.id === id);
    setCustomerName(c?.company_name || '');
  };

  const handleUpload = async () => {
    if (!customerId || !taxPeriod || !file) {
      toast.error('กรุณาเลือกลูกค้า, งวดภาษี และไฟล์');
      return;
    }
    setParsing(true);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const res = await base44.functions.invoke('taxqaParseFile', {
      file_url, customer_id: customerId, customer_name: customerName,
      tax_period: taxPeriod, form_type: formType || undefined,
    });

    setResult(res.data);
    setParsing(false);

    if (res.data.success) {
      toast.success(`Parse สำเร็จ: ${res.data.parsed_count} รายการ`);
      onParseComplete?.(res.data);
    } else {
      toast.error(`Parse ล้มเหลว: ${(res.data.errors || []).map(e => e.message).join(', ')}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="w-5 h-5" />
          อัปโหลดไฟล์ Excel จาก PEAK
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">ลูกค้า *</label>
            <SearchableSelect
              value={customerId}
              onValueChange={handleCustomerChange}
              options={customers.map(c => ({ value: c.id, label: c.company_name }))}
              placeholder="พิมพ์ชื่อลูกค้า..."
            />
          </div>

          {/* Period */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">งวดภาษี *</label>
            <Select value={taxPeriod} onValueChange={setTaxPeriod}>
              <SelectTrigger><SelectValue placeholder="YYYY-MM" /></SelectTrigger>
              <SelectContent>
                {periodOptions.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Form type (optional — auto-detect) */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">ประเภทแบบ (auto-detect)</label>
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger><SelectValue placeholder="อัตโนมัติ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">อัตโนมัติ</SelectItem>
                {FORM_TYPES.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* File input */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">ไฟล์ Excel (.xlsx) *</label>
          <div
            onClick={() => document.getElementById('taxqa-file-input')?.click()}
            className="flex items-center gap-3 border-2 border-dashed border-border rounded-lg px-4 py-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <div className="shrink-0 h-9 px-4 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90">
              เลือกไฟล์
            </div>
            <span className="text-sm text-muted-foreground truncate">
              {file ? file.name : 'ยังไม่ได้เลือกไฟล์'}
            </span>
            <input
              id="taxqa-file-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <Button onClick={handleUpload} disabled={parsing || !customerId || !taxPeriod || !file} className="gap-2">
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {parsing ? 'กำลัง Parse...' : 'อัปโหลดและ Parse'}
        </Button>

        {/* Result */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
              <span className="font-semibold">{result.success ? 'Parse สำเร็จ' : 'Parse ล้มเหลว'}</span>
            </div>
            {result.success && (
              <div className="text-sm space-y-1">
                <p>Layout: <span className="font-mono">{result.detected_layout}</span></p>
                <p>ประเภท: <span className="font-semibold">{result.form_type}</span></p>
                <p>จำนวนรายการ: <span className="font-semibold">{result.parsed_count}</span></p>
                {result.filed_ref && <p>เลขอ้างอิง: <span className="font-mono">{result.filed_ref}</span></p>}
                {result.vat_direction && <p>ทิศทาง: <span className="font-semibold">{result.vat_direction === 'input' ? 'ภาษีซื้อ' : 'ภาษีขาย'}</span></p>}
              </div>
            )}
            {(result.errors || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className={`text-sm flex items-start gap-1.5 ${e.severity === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}