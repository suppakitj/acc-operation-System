import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TEMPLATE_HEADERS = [
  'company_name', 'company_name_en', 'tax_id', 'address',
  'customer_group', 'contact_person', 'contact_email', 'contact_phone',
  'line_id', 'status', 'notes'
];

const TEMPLATE_EXAMPLE = [
  'บริษัท ตัวอย่าง จำกัด', 'Example Co., Ltd.', '0105500000001', '123 ถนนสาทร กรุงเทพฯ 10120',
  'sme', 'คุณสมชาย', 'somchai@example.com', '081-234-5678',
  'somchai_line', 'active', 'ลูกค้าใหม่'
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

export default function CustomerImportExport({ customers, generateCustomerCode }) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Download Template
  const handleDownloadTemplate = () => {
    const csv = generateCSV(TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE]);
    downloadCSV(csv, 'customer_import_template.csv');
    toast.success('ดาวน์โหลด Template สำเร็จ');
  };

  // Export Data
  const handleExport = () => {
    if (customers.length === 0) {
      toast.error('ไม่มีข้อมูลลูกค้าให้ Export');
      return;
    }
    const exportHeaders = [
      'customer_code', 'company_name', 'company_name_en', 'tax_id', 'address',
      'customer_group', 'departments', 'services',
      'supervisor_name', 'primary_officer_name',
      'contact_person', 'contact_email', 'contact_phone', 'line_id',
      'status', 'notes'
    ];
    const rows = customers.map(c => [
      c.customer_code || '', c.company_name || '', c.company_name_en || '',
      c.tax_id || '', c.address || '', c.customer_group || '',
      (c.departments || []).join(';'), (c.services || []).join(';'),
      c.supervisor_name || '', c.primary_officer_name || '',
      c.contact_person || '', c.contact_email || '', c.contact_phone || '',
      c.line_id || '', c.status || '', c.notes || ''
    ]);
    const csv = generateCSV(exportHeaders, rows);
    downloadCSV(csv, `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Export ${customers.length} ลูกค้าสำเร็จ`);
  };

  // Import File
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();

    setIsImporting(true);
    setImportResult(null);
    setShowImportDialog(true);

    if (ext === 'csv') {
      // Parse CSV client-side
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        setImportResult({ success: 0, failed: 0, errors: ['ไฟล์ไม่มีข้อมูล (ต้องมีอย่างน้อย 1 แถวหลัง header)'] });
        setIsImporting(false);
        return;
      }
      const headers = parseCSVLine(lines[0]);
      const nameIdx = headers.findIndex(h => h.toLowerCase().replace(/\s/g, '_') === 'company_name');
      if (nameIdx === -1) {
        setImportResult({ success: 0, failed: 0, errors: ['ไม่พบคอลัมน์ "company_name" ใน header — กรุณาใช้ Template ที่ระบบให้'] });
        setIsImporting(false);
        return;
      }

      const records = [];
      const errors = [];
      let currentCustomers = [...customers];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => {
          const key = h.toLowerCase().replace(/\s/g, '_');
          if (values[idx]) row[key] = values[idx];
        });
        if (!row.company_name) {
          errors.push(`แถว ${i + 1}: ไม่มีชื่อบริษัท (company_name)`);
          continue;
        }
        // Auto-generate customer code
        row.customer_code = generateCustomerCode(currentCustomers);
        currentCustomers.push(row);
        if (!row.status) row.status = 'active';
        records.push(row);
      }

      // Bulk create
      let success = 0;
      for (const rec of records) {
        try {
          await base44.entities.Customer.create(rec);
          success++;
        } catch (err) {
          errors.push(`"${rec.company_name}": ${err.message}`);
        }
      }

      setImportResult({ success, failed: errors.length, errors });
      setIsImporting(false);
      if (success > 0) queryClient.invalidateQueries({ queryKey: ['customers'] });

    } else if (ext === 'xlsx' || ext === 'xls') {
      // Use UploadFile + ExtractDataFromUploadedFile for Excel
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                company_name: { type: 'string' },
                company_name_en: { type: 'string' },
                tax_id: { type: 'string' },
                address: { type: 'string' },
                customer_group: { type: 'string' },
                contact_person: { type: 'string' },
                contact_email: { type: 'string' },
                contact_phone: { type: 'string' },
                line_id: { type: 'string' },
                status: { type: 'string' },
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

        const rows = Array.isArray(result.output) ? result.output : [];
        const errors = [];
        let success = 0;
        let currentCustomers = [...customers];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row.company_name) {
            errors.push(`แถว ${i + 1}: ไม่มีชื่อบริษัท`);
            continue;
          }
          row.customer_code = generateCustomerCode(currentCustomers);
          currentCustomers.push(row);
          if (!row.status) row.status = 'active';
          try {
            await base44.entities.Customer.create(row);
            success++;
          } catch (err) {
            errors.push(`"${row.company_name}": ${err.message}`);
          }
        }

        setImportResult({ success, failed: errors.length, errors });
        if (success > 0) queryClient.invalidateQueries({ queryKey: ['customers'] });
      } catch (err) {
        setImportResult({ success: 0, failed: 0, errors: [err.message] });
      }
      setIsImporting(false);

    } else {
      setImportResult({ success: 0, failed: 0, errors: ['รองรับเฉพาะไฟล์ .csv, .xlsx, .xls'] });
      setIsImporting(false);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="flex gap-1.5">
        {/* Import */}
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" /> Import
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />

        {/* Export / Template dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport} className="gap-2 text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export ข้อมูลลูกค้า (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadTemplate} className="gap-2 text-xs">
              <Download className="w-3.5 h-3.5" /> Download Template (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Import Result Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Import ข้อมูลลูกค้า
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
              {/* Success / Failed counts */}
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

              {/* Error details */}
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