import React, { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Mail, Save, Loader2, FileText, FileBarChart2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import PeriodSelector from '@/components/shared/PeriodSelector';
import { defaultPeriodState, resolvePeriod, resolveComparison } from '@/utils/periodUtils';
import { buildKpiReportData } from '@/utils/kpiReportData';
import { generateKpiNarrative } from '@/utils/kpiNarrative';
import { elementToPdfBlob, downloadBlob, uploadPdf, emailReport } from '@/utils/reportExport';
import BoardReport from '@/components/report/BoardReport';


const list = (E, sort = '-created_date', n = 2000) => base44.entities[E].list(sort, n);

export default function KpiReportCenter() {
  const [period, setPeriod] = useState(() => {
    const s = defaultPeriodState();
    return { ...s, resolved: resolvePeriod(s), comparisonResolved: resolveComparison(s.comparison, s) };
  });
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(null);
  const reportRef = useRef(null);

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: users = [] } = useUserList();
  const { data: tasks = [] } = useQuery({ queryKey: ['rpt-tasks'], queryFn: () => list('Task'), staleTime: 5 * 60_000 });
  const { data: timeEntries = [] } = useQuery({ queryKey: ['rpt-time'], queryFn: () => list('TimeEntry', '-start_time'), staleTime: 5 * 60_000 });
  const { data: meetingNotes = [] } = useQuery({ queryKey: ['rpt-meet'], queryFn: () => list('MeetingNote'), staleTime: 5 * 60_000 });
  const { data: billings = [] } = useQuery({ queryKey: ['rpt-bill'], queryFn: () => list('Billing'), staleTime: 5 * 60_000 });
  const { data: pulses = [] } = useQuery({ queryKey: ['rpt-pulse'], queryFn: () => list('PulseResponse'), staleTime: 5 * 60_000 });
  const { data: configs = [] } = useQuery({ queryKey: ['rpt-config'], queryFn: () => base44.entities.AppConfig.list(), staleTime: 60_000 });
  const { data: archive = [], refetch: refetchArchive } = useQuery({ queryKey: ['kpi-archive'], queryFn: () => list('KpiReport', '-created_date', 100) });

  const config = useMemo(() => {
    const map = {};
    configs.forEach((c) => { try { map[c.key] = JSON.parse(c.value); } catch (_e) { map[c.key] = c.value; } });
    return map;
  }, [configs]);
  const fiscalStart = Number(config.fiscal_start_month) || 1;

  const cur = period.resolved;
  const cmp = period.comparisonResolved;
  const meta = useMemo(() => ({
    title: `KPI Report · ${cur?.label || ''}`,
    viewerName: currentUser?.nickname || currentUser?.full_name || currentUser?.email || '',
    generatedAt: new Date().toLocaleString('th-TH'),
  }), [cur, currentUser]);

  const generate = async () => {
    setBusy('generate');
    try {
      const data = buildKpiReportData({ users, tasks, timeEntries, meetingNotes, billings, pulses, from: cur.from, to: cur.to, compareFrom: cmp?.from, compareTo: cmp?.to, config });
      const ai = await generateKpiNarrative(data);
      setReport({ data, ai });
      toast({ title: 'สร้างรายงานเรียบร้อย' });
    } catch (e) {
      toast({ title: 'เกิดข้อผิดพลาด', description: e.message, variant: 'destructive' });
    }
    setBusy(null);
  };

  const doPdf = async () => {
    setBusy('pdf');
    try {
      await document.fonts?.ready;
      const blob = await elementToPdfBlob(reportRef.current);
      downloadBlob(blob, `${meta.title}.pdf`);
      toast({ title: 'ดาวน์โหลด PDF เรียบร้อย' });
    } catch (e) {
      toast({ title: 'สร้าง PDF ไม่สำเร็จ', variant: 'destructive' });
    }
    setBusy(null);
  };

  const doEmail = async () => {
    setBusy('email');
    try {
      const html = reportRef.current.outerHTML;
      const sent = await emailReport({ users, fromName: 'ACC Consulting', subject: `[KPI Report] ${cur.label}`, html });
      toast({ title: `ส่งอีเมลแล้ว ${sent} ฉบับ` });
    } catch (e) {
      toast({ title: 'ส่งอีเมลไม่สำเร็จ', variant: 'destructive' });
    }
    setBusy(null);
  };

  const doSave = async () => {
    setBusy('save');
    try {
      await document.fonts?.ready;
      const blob = await elementToPdfBlob(reportRef.current);
      const pdf_url = await uploadPdf(blob, `${meta.title}.pdf`);
      const { data, ai } = report;
      await base44.entities.KpiReport.create({
        title: meta.title,
        report_type: period.type,
        period_key: cur.key,
        period_from: cur.from,
        period_to: cur.to,
        firm_health_overall: data.firmHealth.overall,
        firm_health_operational: data.firmHealth.operational,
        firm_health_financial: data.firmHealth.financial,
        kpi_json: JSON.stringify(data),
        ai_executive_summary: ai.executive_summary,
        ai_highlights: ai.highlights || [],
        ai_concerns: ai.concerns || [],
        ai_recommendations: ai.recommendations || [],
        ai_risk_flags: ai.risk_flags || [],
        pdf_url,
        status: 'completed',
        generated_by: currentUser?.email,
        generated_by_name: meta.viewerName,
      });
      await refetchArchive();
      toast({ title: 'บันทึกเข้าคลังรายงานแล้ว' });
    } catch (e) {
      toast({ title: 'บันทึกไม่สำเร็จ', description: e.message, variant: 'destructive' });
    }
    setBusy(null);
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KPI Report Center</h1>
        <p className="text-sm text-muted-foreground">รายงานสำหรับที่ประชุมผู้บริหาร — สร้าง · ดาวน์โหลด · ส่ง · จัดเก็บ</p>
      </div>

      <PeriodSelector value={period} onChange={setPeriod} fiscalStart={fiscalStart} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={!!busy}>
          {busy === 'generate' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          สร้างรายงาน
        </Button>
        <Button variant="outline" onClick={doPdf} disabled={!report || !!busy}>
          {busy === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          ดาวน์โหลด PDF
        </Button>
        <Button variant="outline" onClick={doEmail} disabled={!report || !!busy}>
          {busy === 'email' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          ส่งอีเมลผู้บริหาร
        </Button>
        <Button variant="outline" onClick={doSave} disabled={!report || !!busy}>
          {busy === 'save' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          บันทึกเข้าคลัง
        </Button>
      </div>

      {report && (
        <div className="overflow-auto border rounded-xl bg-slate-100 p-4 flex justify-center">
          <BoardReport ref={reportRef} data={report.data} ai={report.ai} meta={meta} />
        </div>
      )}

      {/* Archive */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileBarChart2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">คลังรายงาน (Archive)</h2>
        </div>
        <div className="divide-y">
          {archive.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  Health {r.firm_health_overall} · {r.report_type} · {r.generated_by_name} · {new Date(r.created_date).toLocaleDateString('th-TH')}
                </div>
              </div>
              {r.pdf_url && (
                <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 shrink-0 ml-2 hover:underline">
                  <FileDown className="w-3 h-3" />PDF
                </a>
              )}
            </div>
          ))}
          {archive.length === 0 && <p className="text-sm text-muted-foreground py-3">ยังไม่มีรายงานที่จัดเก็บ</p>}
        </div>
      </Card>
    </div>
  );
}