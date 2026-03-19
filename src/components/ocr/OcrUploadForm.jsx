import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import CustomerSearchSelect from './CustomerSearchSelect';

export default function OcrUploadForm({ onSubmitted }) {
  const [file, setFile] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => base44.entities.Customer.list('company_name', 200),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('กรุณาเลือกไฟล์ PDF'); return; }
    if (!file.name.toLowerCase().endsWith('.pdf')) { toast.error('รองรับเฉพาะไฟล์ PDF เท่านั้น'); return; }

    setUploading(true);

    // 1. Upload PDF to Base44 storage
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // 2. Create OcrJob record
    const customer = customers.find(c => c.id === customerId);
    const job = await base44.entities.OcrJob.create({
      filename: file.name,
      file_url,
      status: 'uploading',
      customer_id: customerId || '',
      customer_name: customer?.company_name || '',
      notes,
    });

    // 3. Submit to Manus OCR
    const res = await base44.functions.invoke('submitOcr', { ocr_job_id: job.id });

    if (res.data?.success) {
      toast.success('ส่ง OCR สำเร็จ — กำลังประมวลผล...');
    } else {
      toast.error('เกิดข้อผิดพลาด: ' + (res.data?.error || 'Unknown error'));
    }

    setFile(null);
    setCustomerId('');
    setNotes('');
    setUploading(false);
    onSubmitted?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>ไฟล์ PDF Bank Statement</Label>
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>ลบ</Button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">คลิกเพื่อเลือกไฟล์ PDF</p>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
      </div>

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