import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2, X, Search, FileSpreadsheet, FileType, Zap, Bot } from 'lucide-react';
import { toast } from 'sonner';
import CustomerSearchSelect from './CustomerSearchSelect';

const AIGEN_DOC_TYPES = [
  { value: 'general-ocr', label: 'General OCR (อ่านข้อความทั่วไป)' },
  { value: 'table-extraction', label: 'Table Extraction (ดึงตาราง)' },
  { value: 'bank-statement', label: 'Bank Statement (Statement ธนาคาร)' },
  { value: 'book-bank', label: 'Book Bank (สมุดบัญชี)' },
  { value: 'general-invoice', label: 'General Invoice (ใบแจ้งหนี้/ใบเสร็จ)' },
  { value: 'payslip', label: 'Payslip (สลิปเงินเดือน)' },
  { value: 'idcard', label: 'ID Card (บัตรประชาชน)' },
  { value: 'passport', label: 'Passport (หนังสือเดินทาง)' },
  { value: 'driver-licence', label: 'Driver Licence (ใบขับขี่)' },
  { value: 'house-registration', label: 'House Registration (ทะเบียนบ้าน)' },
  { value: 'business-registration', label: 'Business Registration (หนังสือจดทะเบียน)' },
  { value: 'health-check-report', label: 'Health Check Report (ผลตรวจสุขภาพ)' },
  { value: 'hospital-invoice', label: 'Hospital Invoice (ใบแจ้งหนี้โรงพยาบาล)' },
  { value: 'shipping-label', label: 'Shipping Label (ใบปะหน้าพัสดุ)' },
  { value: 'vehicle-insurance-policy', label: 'Vehicle Insurance (กรมธรรม์รถ)' },
  { value: 'vehicle-registration-book', label: 'Vehicle Registration (เล่มทะเบียนรถ)' },
];

export default function OcrUploadForm({ onSubmitted }) {
  const [file, setFile] = useState(null);
  const [ocrEngine, setOcrEngine] = useState('aigen');
  const [aigenDocType, setAigenDocType] = useState('general-ocr');
  const [outputFormat, setOutputFormat] = useState('excel');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => base44.entities.Customer.list('company_name', 200),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('กรุณาเลือกไฟล์'); return; }
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif', '.webp'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExts.includes(ext)) { toast.error('รองรับไฟล์ PDF และรูปภาพ (PNG, JPG, TIFF, BMP, GIF, WebP)'); return; }

    setUploading(true);

    // 1. Upload PDF to Base44 storage
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // 2. Create OcrJob record
    const customer = customers.find(c => c.id === customerId);
    const job = await base44.entities.OcrJob.create({
      filename: file.name,
      file_url,
      status: 'uploading',
      ocr_engine: ocrEngine,
      aigen_doc_type: ocrEngine === 'aigen' ? aigenDocType : '',
      output_format: outputFormat,
      custom_prompt: customPrompt || '',
      customer_id: customerId || '',
      customer_name: customer?.company_name || '',
      notes,
    });

    // 3. Submit to OCR engine
    const fnName = ocrEngine === 'aigen' ? 'submitAigenOcr' : 'submitOcr';
    const res = await base44.functions.invoke(fnName, { ocr_job_id: job.id });

    if (res.data?.success) {
      toast.success('ส่ง OCR สำเร็จ — กำลังประมวลผล...');
    } else {
      toast.error('เกิดข้อผิดพลาด: ' + (res.data?.error || 'Unknown error'));
    }

    setFile(null);
    setOcrEngine('aigen');
    setAigenDocType('general-ocr');
    setOutputFormat('excel');
    setCustomPrompt('');
    setCustomerId('');
    setNotes('');
    setUploading(false);
    onSubmitted?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>ไฟล์เอกสาร (PDF, รูปภาพ)</Label>
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium truncate max-w-[180px]">{file.name}</span>
              <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>ลบ</Button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">คลิกเพื่อเลือกไฟล์</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">PDF, PNG, JPG, TIFF, BMP, GIF, WebP</p>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.gif,.webp"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
      </div>

      {/* OCR Engine Selection */}
      <div className="space-y-1.5">
        <Label>OCR Engine</Label>
        <Select value={ocrEngine} onValueChange={setOcrEngine}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aigen">
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-purple-600" /> AiGen AIScript (เร็ว, หลายประเภท)</span>
            </SelectItem>
            <SelectItem value="manus">
              <span className="flex items-center gap-2"><Bot className="w-4 h-4 text-blue-600" /> Manus AI (แปลงเป็นไฟล์)</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AiGen Document Type */}
      {ocrEngine === 'aigen' && (
        <div className="space-y-1.5">
          <Label>ประเภทเอกสาร</Label>
          <Select value={aigenDocType} onValueChange={setAigenDocType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AIGEN_DOC_TYPES.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">เลือกประเภทเอกสารเพื่อให้ OCR แม่นยำที่สุด</p>
        </div>
      )}

      {/* Output Format — only for Manus */}
      {ocrEngine === 'manus' && (
        <div className="space-y-1.5">
          <Label>รูปแบบผลลัพธ์</Label>
          <Select value={outputFormat} onValueChange={setOutputFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">
                <span className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel (.xlsx)</span>
              </SelectItem>
              <SelectItem value="word">
                <span className="flex items-center gap-2"><FileType className="w-4 h-4 text-blue-600" /> Word (.docx)</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom Prompt — only for Manus */}
      {ocrEngine === 'manus' && (
        <div className="space-y-1.5">
          <Label>คำสั่ง OCR <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span></Label>
          <Textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="เช่น แปลงข้อมูลในตารางเป็น Excel, สรุปเอกสารเป็น Word, ดึงข้อมูลใบเสร็จ ฯลฯ"
            className="h-20 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">ถ้าไม่ระบุ ระบบจะดึงข้อมูลจากเอกสารอัตโนมัติ</p>
        </div>
      )}

      <CustomerSearchSelect
        customers={customers}
        value={customerId}
        onChange={setCustomerId}
      />

      <div className="space-y-1.5">
        <Label>หมายเหตุ</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="เช่น Statement เดือน ม.ค. 2025" />
      </div>

      <Button type="submit" disabled={uploading || !file} className="w-full">
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังอัปโหลดและส่ง OCR...</>
        ) : (
          <><Upload className="w-4 h-4 mr-2" /> อัปโหลดและเริ่ม OCR</>
        )}
      </Button>
    </form>
  );
}