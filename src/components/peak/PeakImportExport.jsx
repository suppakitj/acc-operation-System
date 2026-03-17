import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, parseISO } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const TEMPLATE_HEADERS = [
  'customer_name', 'package_type', 'payer_type', 'payment_date', 'expiry_date',
  'license_status', 'notes'
];

const TEMPLATE_EXAMPLE = [
  'บริษัท ตัวอย่าง จำกัด', 'pro', 'customer_direct_peak', '2026-01-15', '2027-01-15',
  'active', 'หมายเหตุตัวอย่าง'
];

const TEMPLATE_COMMENT_ROW = [
  '(ชื่อลูกค้า)', 'basic / pro / pro_plus',
  'customer_direct_peak / customer_via_acc / acc_pay_for_customer',
  'YYYY-MM-DD', 'YYYY-MM-DD (ถ้าไม่กรอก = payment_date + 365 วัน)',
  'active / expiring_soon / expired / renewed / cancelled',
  '(ถ้ามี)'
];

function generateCSV(headers, rows) {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  return BOM + csvContent;
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

export default function PeakImportExport({ licenses = [] }) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
  });

  const handleDownloadTemplate = () => {
    const csv = generateCSV(TEMPLATE_HEADERS, [TEMPLATE_COMMENT_ROW, TEMPLATE_EXAMPLE]);
    downloadCSV(csv, 'peak_license_import_template.csv');
    toast.success('ดาวน์โหลด Template สำเร็จ');
  };

  const handleExport = () => {
    if (licenses.length === 0) {
      toast.error('ไม่มีข้อมูลให้ Export');
      return;
    }
    const exportHeaders = [
      'customer_name', 'package_type', 'payer_type', 'payment_date',
      'expiry_date', 'license_status', 'notes'
    ];
    const rows = licenses.map(l => [
      l.customer_name || '', l.package_type || '', l.payer_type || '',
      l.payment_date || '', l.expiry_date || '',
      l.license_status || '', l.notes || ''
    ]);
    const csv = generateCSV(exportHeaders, rows);
    downloadCSV(csv, `peak_licenses_export_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Export ${licenses.length} รายการสำเร็จ`);
  };

  const processRecords = async (rows) => {
    const errors = [];
    let success = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.customer_name) {
        errors.push(`แถว ${i + 2}: ไม่มี customer_name`);
        continue;
      }

      // Validate package_type
      if (row.package_type && !['basic', 'pro', 'pro_plus'].includes(row.package_type)) {
        errors.push(`แถว ${i + 2}: package_type ไม่ถูกต้อง "${row.package_type}"`);
        continue;
      }

      // Match customer
      const matched = customers.find(c =>
        c.company_name?.toLowerCase() === row.customer_name.toLowerCase()
      );

      const record = {
        customer_name: row.customer_name,
        customer_id: matched?.id || '',
        package_type: row.package_type || 'basic',
        payer_type: row.payer_type || 'customer_direct_peak',
        payment_date: row.payment_date || '',
        license_status: row.license_status || 'active',
        notes: row.notes || '',
      };

      // Auto-calculate expiry if not provided
      if (record.payment_date && !row.expiry_date) {
        record.expiry_date = format(addDays(parseISO(record.payment_date), 365), 'yyyy-MM-dd');
      } else if (row.expiry_date) {
        record.expiry_date = row.expiry_date;
      }

      try {
        await base44.entities.PeakLicense.create(record);
        success++;
      } catch (err) {
        errors.push(`"${row.customer_name}": ${err.message}`);
      }
    }

    return { success, failed: errors.length, errors };
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    setIsImporting(true);
    setImportResult(null);
    setShowImportDialog(true);

    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        setImportResult({ success: 0, failed: 0, errors: ['ไฟล์ไม่มีข้อมูล'] });
        setIsImporting(false);
        return;
      }
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, '_'));
      if (!headers.includes('customer_name')) {
        setImportResult({ success: 0, failed: 0, errors: ['ไม่พบคอลัมน์ "customer_name" ใน header — กรุณาใช้ Template'] });
        setIsImporting(false);
        return;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => { if (values[idx]) row[h] = values[idx]; });
        // Skip comment row (starts with "(")
        if (row.customer_name?.startsWith('(')) continue;
        rows.push(row);
      }

      const result = await processRecords(rows);
      setImportResult(result);
      setIsImporting(false);
      if (result.success > 0) queryClient.invalidateQueries({ queryKey: ['peakLicenses'] });

    } else if (ext === 'xlsx' || ext === 'xls') {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                customer_name: { type: 'string' },
                package_type: { type: 'string' },
                payer_type: { type: 'string' },
                payment_date: { type: 'string' },
                expiry_date: { type: 'string' },
                license_status: { type: 'string' },
                notes: { type: 'string' },
              }
            }
          }
        });

        if (result.status === 'error') {
          setImportResult({ success: 0, failed: 0, errors: [result.details || 'ไม่สามารถอ่านไฟล์ Excel ได้'] });
          setIsImporting(false);
          return;
        }

        const rows = (Array.isArray(result.output) ? result.output : []).filter(r => r.customer_name && !r.customer_name.startsWith('('));
        const importRes = await processRecords(rows);
        setImportResult(importRes);
        if (importRes.success > 0) queryClient.invalidateQueries({ queryKey: ['peakLicenses'] });
      } catch (err) {
        setImportResult({ success: 0, failed: 0, errors: [err.message] });
      }
      setIsImporting(false);

    } else {
      setImportResult({ success: 0, failed: 0, errors: ['รองรับเฉพาะไฟล์ .csv, .xlsx, .xls'] });
      setIsImporting(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-3.5 h-3.5" /> Import
      </Button>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExport} className="gap-2 text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export ข้อมูล Peak License (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadTemplate} className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Download Template (CSV)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Import Peak License
            </DialogTitle>
            <DialogDescription>ผลการนำเข้าข้อมูล</DialogDescription>
          </DialogHeader>

          {isImporting ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">กำลังนำเข้าข้อมูล...</p>
            </div>
          ) : importResult && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg flex-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-lg font-bold text-green-700">{importResult.success}</p>
                    <p className="text-[10px] text-green-600">นำเข้าสำเร็จ</p>
                  </div>
                </div>
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg flex-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="text-lg font-bold text-red-700">{importResult.failed}</p>
                      <p className="text-[10px] text-red-600">ล้มเหลว</p>
                    </div>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-1">รายละเอียดข้อผิดพลาด:</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-red-600">• {err}</p>
                  ))}
                </div>
              )}
              <Button className="w-full" onClick={() => setShowImportDialog(false)}>ปิด</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}