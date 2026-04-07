import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Eye, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import GenerationPreviewTable from '../components/task-generation/GenerationPreviewTable';
import GenerationStats from '../components/task-generation/GenerationStats';

const MONTH_LABELS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export default function TaskGeneration() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [previewResult, setPreviewResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  // Fetch template count for info
  const { data: templates = [] } = useQuery({
    queryKey: ['taskTemplates'],
    queryFn: () => base44.entities.TaskTemplate.list('-created_date', 500),
    staleTime: 2 * 60_000,
  });
  const activeTemplates = templates.filter(t => t.status === 'active' || !t.status);

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewResult(null);
    setLastGenerated(null);
    try {
      const res = await base44.functions.invoke('generateMonthlyTasks', {
        target_month: parseInt(month),
        target_year: parseInt(year),
        dry_run: true,
      });
      setPreviewResult(res.data);
    } catch (err) {
      toast.error('Preview ล้มเหลว: ' + (err.response?.data?.error || err.message));
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!previewResult || previewResult.total_tasks === 0) {
      toast.error('ไม่มี task ที่จะสร้าง กรุณา Preview ก่อน');
      return;
    }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateMonthlyTasks', {
        target_month: parseInt(month),
        target_year: parseInt(year),
        dry_run: false,
      });
      setLastGenerated(res.data);
      setPreviewResult(null);
      toast.success(`สร้าง ${res.data.total_tasks} tasks สำเร็จ!`);
    } catch (err) {
      toast.error('Generate ล้มเหลว: ' + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const years = [];
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) years.push(y);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">สร้างงานอัตโนมัติ</h1>
        <p className="text-xs md:text-sm text-muted-foreground">สร้าง Task รายเดือนจาก Template ให้ลูกค้าทุกราย</p>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0" />
        <span>มี {activeTemplates.length} templates ที่ active — ระบบจับคู่กับลูกค้าตาม Service หรือ Obligation ที่ตรงกัน</span>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">เลือกเดือน/ปี ที่ต้องการสร้างงาน</CardTitle>
          <CardDescription className="text-xs">ระบบจะตรวจสอบว่า Template ไหนตรงกับเดือนที่เลือก และจับคู่กับลูกค้าที่ใช้บริการนั้น</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">เดือน</label>
              <Select value={month} onValueChange={v => { setMonth(v); setPreviewResult(null); setLastGenerated(null); }}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_LABELS.map((label, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ปี</label>
              <Select value={year} onValueChange={v => { setYear(v); setPreviewResult(null); setLastGenerated(null); }}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing} className="gap-1.5">
                {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                Preview
              </Button>
              <Button size="sm" onClick={handleGenerate} disabled={generating || !previewResult || previewResult.total_tasks === 0} className="gap-1.5">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                สร้างงานจริง
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Result */}
      {previewResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Preview: {MONTH_LABELS[parseInt(month) - 1]} {year}</h2>
            <Badge variant="outline" className="text-[10px]">Dry Run</Badge>
          </div>
          <GenerationStats result={previewResult} />
          <GenerationPreviewTable tasks={previewResult.tasks} />
        </div>
      )}

      {/* Generated Result */}
      {lastGenerated && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-semibold text-green-700">
              สร้างสำเร็จ: {lastGenerated.total_tasks} tasks สำหรับ {MONTH_LABELS[parseInt(month) - 1]} {year}
            </h2>
          </div>
          <GenerationStats result={lastGenerated} />
          {lastGenerated.total_tasks === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>ไม่มี task ที่สร้างได้ — อาจเป็นเพราะสร้างไปแล้ว หรือไม่มี Template/ลูกค้าที่ตรงกัน</span>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <Card className="bg-muted/30">
        <CardContent className="py-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">ระบบทำงานอย่างไร?</h3>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal ml-4">
            <li>ดึง <b>Task Templates</b> ที่ active และตรงกับเดือนที่เลือก</li>
            <li>ดึง <b>ลูกค้า</b> ที่ active — จับคู่ตาม <b>Service</b> (ประเภทบริการ) หรือ <b>Obligation</b> (ภาระผูกพัน) ของลูกค้าที่ตรงกับ template</li>
            <li>จับคู่ template × ลูกค้า = สร้าง task ให้แต่ละคู่</li>
            <li><b>ผู้รับผิดชอบ</b> ดึงจาก "เจ้าหน้าที่หลัก" ใน Customer Profile หรือจาก template</li>
            <li>ระบบตรวจสอบ <b>ไม่ให้ซ้ำ</b> — ถ้าเดือนนั้นมี task จาก template เดียวกัน + ลูกค้าเดียวกันอยู่แล้ว จะข้าม</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}