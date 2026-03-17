import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Download, FileDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const TYPE_MAP = {
  'วันหยุดราชการ': 'national', 'national': 'national',
  'วันหยุดทางศาสนา': 'religious', 'religious': 'religious',
  'วันหยุดพิเศษ': 'special', 'special': 'special',
  'วันหยุดบริษัท': 'company', 'company': 'company',
};

function generateCSV(rows) {
  const BOM = '\uFEFF';
  const header = 'name_th,name_en,date,type,notes';
  const lines = rows.map(r =>
    [r.name_th, r.name_en, r.date, r.type, r.notes].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')
  );
  return BOM + [header, ...lines].join('\n');
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

function downloadFile(content, filename, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function HolidayImportExport({ holidays }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const processRecords = (rows) => {
    const records = [];
    const errors = [];
    rows.forEach((r, i) => {
      if (!r.name_th && !r.name_en && !r.date) return; // skip empty
      if (!r.name_th || !r.date) {
        errors.push(`แถว ${i + 2}: ขาดชื่อวันหยุดหรือวันที่`);
        return;
      }
      const dateStr = r.date.trim();
      // Accept yyyy-mm-dd or dd/mm/yyyy
      let parsedDate = dateStr;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const year = new Date(parsedDate).getFullYear();
      if (isNaN(year)) { errors.push(`แถว ${i + 2}: วันที่ไม่ถูกต้อง "${dateStr}"`); return; }

      const typeVal = TYPE_MAP[(r.type || '').trim().toLowerCase()] || TYPE_MAP[(r.type || '').trim()] || 'national';

      records.push({
        name_th: r.name_th.trim(),
        name_en: (r.name_en || '').trim(),
        date: parsedDate,
        year,
        type: typeVal,
        status: 'active',
        notes: (r.notes || '').trim(),
      });
    });
    return { records, errors };
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setResult(null);

    try {
      let rows = [];
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast.error('ไฟล์ว่างเปล่า'); setImporting(false); return; }
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
        rows = lines.slice(1).map(line => {
          const vals = parseCSVLine(line);
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          return obj;
        });
      } else {
        // Excel — upload and extract
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name_th: { type: 'string' },
                name_en: { type: 'string' },
                date: { type: 'string' },
                type: { type: 'string' },
                notes: { type: 'string' },
              }
            }
          }
        });
        rows = res.output || [];
      }

      const { records, errors } = processRecords(rows);
      if (records.length === 0) {
        setResult({ success: 0, failed: errors.length, errors });
        setImporting(false);
        return;
      }

      await base44.entities.HolidayMaster.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ['holidayMaster'] });
      setResult({ success: records.length, failed: errors.length, errors });
      toast.success(`นำเข้าสำเร็จ ${records.length} รายการ`);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
      setResult({ success: 0, failed: 0, errors: [err.message] });
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const sample = [
      { name_th: 'วันขึ้นปีใหม่', name_en: 'New Year', date: '2026-01-01', type: 'national', notes: '' },
      { name_th: 'วันสงกรานต์', name_en: 'Songkran', date: '2026-04-13', type: 'national', notes: '13-15 เมษายน' },
    ];
    downloadFile(generateCSV(sample), 'holiday_template.csv');
    toast.success('ดาวน์โหลด Template เรียบร้อย');
  };

  const exportData = () => {
    if (!holidays.length) { toast.error('ไม่มีข้อมูล'); return; }
    downloadFile(generateCSV(holidays), `holidays_export_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('ส่งออกข้อมูลเรียบร้อย');
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Import / Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-2" /> Import จากไฟล์ (CSV/Excel)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTemplate}>
            <FileDown className="w-3.5 h-3.5 mr-2" /> Download Template
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportData}>
            <Download className="w-3.5 h-3.5 mr-2" /> Export ข้อมูลปัจจุบัน
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import Result Dialog */}
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ผลการนำเข้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {result?.success > 0 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">นำเข้าสำเร็จ {result.success} รายการ</span>
              </div>
            )}
            {result?.failed > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">ล้มเหลว {result.failed} รายการ</span>
              </div>
            )}
            {result?.errors?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}
            <Button className="w-full text-xs" onClick={() => setResult(null)}>ปิด</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}