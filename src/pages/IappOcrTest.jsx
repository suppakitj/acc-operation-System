import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Loader2, CheckCircle2, AlertTriangle, Clock, Image } from 'lucide-react';

const OCR_TYPES = [
  { value: 'document', label: 'General Document OCR → Text', desc: 'แปลงเอกสารเป็น Plain Text' },
  { value: 'document_layout', label: 'Document Layout → JSON', desc: 'วิเคราะห์โครงสร้างเอกสาร + Bounding Box' },
  { value: 'receipt', label: 'Receipt / Invoice OCR', desc: 'อ่านใบเสร็จ/ใบกำกับภาษี → Structured JSON' },
];

export default function IappOcrTest() {
  const [ocrType, setOcrType] = useState('document');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    setElapsed(null);
    if (f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    const start = Date.now();
    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Call iApp OCR
      const res = await base44.functions.invoke('iappOcr', { file_url, ocr_type: ocrType });
      setElapsed(Date.now() - start);
      if (res.data?.error) {
        setError(res.data.error + (res.data.details ? ': ' + res.data.details : ''));
      } else {
        setResult(res.data);
      }
    } catch (err) {
      setElapsed(Date.now() - start);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = OCR_TYPES.find(t => t.value === ocrType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          ทดสอบ iApp OCR API
        </h1>
        <p className="text-sm text-muted-foreground">เชื่อมต่อ iApp Technology OCR API — อัปโหลดไฟล์แล้วดูผลลัพธ์</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">อัปโหลดเอกสาร</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OCR Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ประเภท OCR</label>
              <Select value={ocrType} onValueChange={setOcrType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCR_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ไฟล์เอกสาร</label>
              <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('ocr-file-input')?.click()}>
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="max-h-[200px] mx-auto rounded-lg mb-2" />
                ) : file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">คลิกเพื่อเลือกไฟล์</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG, PDF, DOC, XLS (สูงสุด 30MB)</p>
                  </div>
                )}
                <input id="ocr-file-input" type="file" className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileChange} />
              </div>
            </div>

            {/* Info */}
            <div className="bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
              <p><strong>API:</strong> iApp Technology (iapp.co.th)</p>
              <p><strong>Endpoint:</strong> {selectedType?.label}</p>
              <p><strong>รองรับ:</strong> ภาษาไทย + อังกฤษ</p>
            </div>

            <Button onClick={handleSubmit} disabled={!file || loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading ? 'กำลังประมวลผล...' : 'ส่ง OCR'}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">ผลลัพธ์</CardTitle>
              {elapsed && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="w-3 h-3" /> {(elapsed / 1000).toFixed(1)}s
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">กำลังส่งไปยัง iApp OCR API...</p>
                <p className="text-[10px] text-muted-foreground">อาจใช้เวลา 3-15 วินาที</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-medium text-red-700">เกิดข้อผิดพลาด</p>
                </div>
                <pre className="text-[11px] text-red-600 whitespace-pre-wrap break-all">{error}</pre>
              </div>
            ) : result ? (
              <OcrResult data={result} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Image className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">อัปโหลดเอกสารแล้วกด "ส่ง OCR" เพื่อดูผลลัพธ์</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OcrResult({ data }) {
  const { ocr_type, result, docx_url } = data;

  if (docx_url) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-700">แปลงเป็น DOCX สำเร็จ</span>
        </div>
        <a href={docx_url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" /> ดาวน์โหลด DOCX
          </Button>
        </a>
      </div>
    );
  }

  if (!result) return <p className="text-sm text-muted-foreground">ไม่มีผลลัพธ์</p>;

  // Receipt OCR
  if (ocr_type === 'receipt' && result.processed) {
    const p = result.processed;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-700">อ่านใบเสร็จสำเร็จ</span>
          {result.process_ms && <Badge variant="outline" className="text-[9px]">{(result.process_ms / 1000).toFixed(1)}s (API)</Badge>}
        </div>

        {/* Invoice info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {p.invoiceType && <Field label="ประเภท" value={p.invoiceType} />}
          {p.invoiceID && <Field label="เลขที่" value={p.invoiceID} />}
          {p.invoiceDate && <Field label="วันที่" value={p.invoiceDate} />}
          {p.issuerName && <Field label="ผู้ออก" value={p.issuerName} />}
          {p.issuerTaxID && <Field label="Tax ID ผู้ออก" value={p.issuerTaxID} />}
          {p.customerName && <Field label="ลูกค้า" value={p.customerName} />}
          {p.customerTaxID && <Field label="Tax ID ลูกค้า" value={p.customerTaxID} />}
        </div>

        {/* Items */}
        {p.items?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">รายการ</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1.5 text-left">#</th>
                    <th className="px-2 py-1.5 text-left">รายการ</th>
                    <th className="px-2 py-1.5 text-right">จำนวน</th>
                    <th className="px-2 py-1.5 text-right">ราคา</th>
                    <th className="px-2 py-1.5 text-right">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1.5">{item.itemNo || i + 1}</td>
                      <td className="px-2 py-1.5">{item.itemName || '-'}</td>
                      <td className="px-2 py-1.5 text-right">{item.itemUnit ?? '-'}</td>
                      <td className="px-2 py-1.5 text-right">{item.itemUnitCost?.toLocaleString() ?? '-'}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{item.itemTotalCost?.toLocaleString() ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
          {p.totalCost != null && <div className="flex justify-between"><span>รวม</span><span className="font-medium">฿{p.totalCost?.toLocaleString()}</span></div>}
          {p.discount > 0 && <div className="flex justify-between"><span>ส่วนลด</span><span className="font-medium text-red-600">-฿{p.discount?.toLocaleString()}</span></div>}
          {p.vat > 0 && <div className="flex justify-between"><span>VAT</span><span className="font-medium">฿{p.vat?.toLocaleString()}</span></div>}
          {p.grandTotal != null && <div className="flex justify-between border-t pt-1"><span className="font-semibold">ยอดรวมสุทธิ</span><span className="font-bold text-green-700">฿{p.grandTotal?.toLocaleString()}</span></div>}
        </div>

        {/* Raw JSON toggle */}
        <RawJson data={result} />
      </div>
    );
  }

  // Document OCR - text
  if (result.text) {
    const texts = Array.isArray(result.text) ? result.text : [result.text];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-700">OCR สำเร็จ</span>
          {result.time && <Badge variant="outline" className="text-[9px]">{result.time.toFixed(1)}s (API)</Badge>}
          {result.iapp && <Badge variant="outline" className="text-[9px]">{result.iapp.char} ตัวอักษร, {(result.iapp.page || 0) + 1} หน้า</Badge>}
        </div>
        <div className="bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-y-auto">
          {texts.map((t, i) => (
            <pre key={i} className="text-xs whitespace-pre-wrap break-words font-mono">{t}</pre>
          ))}
        </div>
        <RawJson data={result} />
      </div>
    );
  }

  // Document Layout
  if (result.pages) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-700">Layout Analysis สำเร็จ</span>
          <Badge variant="outline" className="text-[9px]">{result.pages.length} หน้า</Badge>
        </div>
        {result.pages.map((page, pi) => (
          <div key={pi} className="border rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">หน้า {page.page}</p>
            {page.components?.map((comp, ci) => (
              <div key={ci} className="bg-muted/20 rounded p-2">
                <Badge variant="outline" className="text-[8px] mb-1">{comp.type}</Badge>
                <p className="text-[11px] whitespace-pre-wrap">{comp.text || '(no text)'}</p>
              </div>
            ))}
          </div>
        ))}
        <RawJson data={result} />
      </div>
    );
  }

  // Fallback: show raw JSON
  return <RawJson data={result} defaultOpen />;
}

function Field({ label, value }) {
  return (
    <div className="bg-muted/20 rounded p-2">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  );
}

function RawJson({ data, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="text-[10px] text-primary hover:underline">
        {open ? 'ซ่อน' : 'แสดง'} Raw JSON
      </button>
      {open && (
        <pre className="mt-1 bg-slate-900 text-slate-100 rounded-lg p-3 text-[10px] max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}