import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Upload, Clock4, DollarSign, CalendarOff, Users, Loader2, AlertTriangle } from 'lucide-react';
import PeriodSelector from '@/components/shared/PeriodSelector';
import { defaultPeriodState, resolvePeriod, resolveComparison } from '@/utils/periodUtils';
import { parsePayrollOt } from '@/utils/payrollOtImport';
import { aggregateByPerson, aggregateByMonth, aggregateByCause, aggregateByCustomer, firmOtSummary, breakEvenHire } from '@/utils/overtimeKpi';
import OtCauseTagger from '@/components/overtime/OtCauseTagger';

const fetchList = (E, s = '-ot_date', n = 5000) => base44.entities[E].list(s, n);
const fmtTHB = (v) => new Intl.NumberFormat('th-TH').format(Math.round(v || 0));
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1);

export default function OvertimeAnalytics() {
  const { data: users = [] } = useUserList();
  const { data: configs = [] } = useQuery({ queryKey: ['ot-config'], queryFn: () => base44.entities.AppConfig.list(), staleTime: 60000 });
  const { data: entries = [], refetch } = useQuery({ queryKey: ['ot-entries'], queryFn: () => fetchList('OvertimeEntry'), staleTime: 60000 });

  const [period, setPeriod] = useState(() => {
    const s = { ...defaultPeriodState(), type: 'yearly' };
    return { ...s, resolved: resolvePeriod(s), comparisonResolved: resolveComparison(s.comparison, s) };
  });
  const [preview, setPreview] = useState(null);
  const [replaceRange, setReplaceRange] = useState(true);
  const [busy, setBusy] = useState(null);
  const fileRef = useRef(null);

  const config = useMemo(() => {
    const map = {};
    configs.forEach((c) => { try { map[c.key] = JSON.parse(c.value); } catch (_e) { map[c.key] = c.value; } });
    return map;
  }, [configs]);

  const mult = config.ot_multipliers || { normal: 1.5, holiday_work: 1.0, holiday_ot: 3.0 };
  const fteAnnualCost = Number(config.fte_annual_cost) || 0;
  const fiscalStart = Number(config.fiscal_start_month) || 1;
  const cur = period.resolved;

  const scoped = useMemo(() => entries.filter((e) => e.ot_date >= cur.from && e.ot_date <= cur.to), [entries, cur]);
  const summary = useMemo(() => firmOtSummary({ entries: scoped, users, mult }), [scoped, users, mult]);
  const trend = useMemo(() => aggregateByMonth(scoped), [scoped]);
  const byCause = useMemo(() => aggregateByCause(scoped), [scoped]);
  const byCustomer = useMemo(() => aggregateByCustomer(scoped), [scoped]);
  const be = useMemo(() => breakEvenHire({ otCost: summary.cost, spanDays: daysBetween(cur.from, cur.to), fteAnnualCost }), [summary, cur, fteAnnualCost]);

  const onFile = async (file) => {
    if (!file) return;
    setBusy('parse');
    const buf = await file.arrayBuffer();
    setPreview(parsePayrollOt(buf));
    setBusy(null);
  };

  const commit = async () => {
    setBusy('commit');
    const uByCode = {};
    users.forEach((u) => { if (u.employee_id) uByCode[String(u.employee_id).trim()] = u; });
    const rows = preview.entries.map((e) => {
      const u = uByCode[e.employee_code];
      return { ...e, user_email: u?.email || null, department: e.department || u?.department || '' };
    });
    if (replaceRange && rows.length) {
      const from = rows.reduce((a, r) => r.ot_date < a ? r.ot_date : a, rows[0].ot_date);
      const to = rows.reduce((a, r) => r.ot_date > a ? r.ot_date : a, rows[0].ot_date);
      const existing = entries.filter((e) => e.ot_date >= from && e.ot_date <= to);
      for (const ex of existing) { try { await base44.entities.OvertimeEntry.delete(ex.id); } catch (_) {} }
    }
    for (const r of rows) { try { await base44.entities.OvertimeEntry.create(r); } catch (_) {} }
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    await refetch();
    setBusy(null);
  };

  const previewAgg = preview ? aggregateByPerson({ entries: preview.entries, users, mult }) : [];
  const unmatched = preview ? [...new Set(preview.entries.filter((e) => !users.some((u) => String(u.employee_id).trim() === e.employee_code)).map((e) => e.employee_code))] : [];

  const isJunior = (s) => s && (s.includes('\u0E17\u0E14\u0E25\u0E2D\u0E07') || s.includes('\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E17\u0E14\u0E25\u0E2D\u0E07'));
  const isGone = (s) => s && s.includes('\u0E1E\u0E49\u0E19');

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">OT Analytics</h1>
        <p className="text-sm text-muted-foreground">วิเคราะห์การทำงานล่วงเวลา — ต้นทุน · แนวโน้ม · ต้นเหตุ · ความเสี่ยง burnout</p>
      </div>

      {/* Import */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold"><Upload className="w-4 h-4" /> นำเข้าจากโปรแกรมเงินเดือน</div>
          <input ref={fileRef} type="file" accept=".xlsx" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
          {busy === 'parse' && <div className="text-sm flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> กำลังอ่านไฟล์…</div>}
          {preview && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="text-sm">พบ <b>{preview.entries.length}</b> รายการ · <b>{previewAgg.length}</b> คน</div>
              {unmatched.length > 0 && (
                <div className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> รหัสที่ไม่ตรงกับ User: {unmatched.join(', ')} (จะนำเข้าแบบไม่ผูก email)
                </div>
              )}
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={replaceRange} onChange={(e) => setReplaceRange(e.target.checked)} />
                แทนที่ข้อมูลเดิมในช่วงวันที่ที่นำเข้า (กันซ้ำ)
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={commit} disabled={!!busy}>
                  {busy === 'commit' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}ยืนยันนำเข้า
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}>ยกเลิก</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PeriodSelector value={period} onChange={setPeriod} fiscalStart={fiscalStart} showComparison={false} />

      {/* KPI hero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile icon={Clock4} label="OT รวม" value={`${summary.totalH} ชม.`} sub={`เฉลี่ย ${summary.avgH} ชม./คน · ${summary.staffCount} คน`} />
        <KpiTile icon={DollarSign} label="ต้นทุน OT (ประมาณ)" value={`\u0E3F${fmtTHB(summary.cost)}`} sub={`multiplier ${mult.normal}\u00D7 / ${mult.holiday_work}\u00D7 / ${mult.holiday_ot}\u00D7`} />
        <KpiTile icon={CalendarOff} label="ทำงานวันหยุด" value={`${summary.holidayPct}%`} sub={`${summary.holidayH} ชม. — สัญญาณ burnout`} tone={summary.holidayPct >= 20 ? 'text-red-600' : ''} />
        <KpiTile icon={Users} label="กระจุกตัว Top 3" value={`${summary.concentrationTop3Pct}%`} sub="ของ OT ทั้งหมด" tone={summary.concentrationTop3Pct >= 40 ? 'text-amber-600' : ''} />
      </div>

      {/* Break-even */}
      {fteAnnualCost > 0 && be.equivalentFtes != null && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm">
              ต้นทุน OT ต่อปี (annualized) ≈ <b>\u0E3F{fmtTHB(be.annualOt)}</b> — เทียบเท่า{' '}
              <b className={be.equivalentFtes >= 1 ? 'text-red-600' : ''}>{be.equivalentFtes} FTE</b>
              {be.equivalentFtes >= 1 && <span className="text-muted-foreground"> · OT กำลัง "จ้าง" มากกว่า 1 คนอยู่แล้วในอัตรา premium — ควรพิจารณาจ้างจริง</span>}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">* ตั้งค่า fte_annual_cost ใน AppConfig ให้ตรงกับต้นทุนพนักงานบัญชี 1 คนต่อปี</div>
          </CardContent>
        </Card>
      )}

      {/* Monthly trend */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-2">แนวโน้มรายเดือน</h2>
          {trend.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: -20, right: 10, top: 6 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v} ชม.`} />
                  <Line type="monotone" dataKey="hours" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีข้อมูลในงวดนี้</p>
          )}
        </CardContent>
      </Card>

      {/* Per-person ranking */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">รายบุคคล (เรียงตาม OT)</h2>
          {summary.per.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-1.5 pr-2">พนักงาน</th>
                    <th className="pr-2">แผนก</th>
                    <th className="text-right pr-2">OT รวม</th>
                    <th className="text-right pr-2">วันหยุด</th>
                    <th className="text-right pr-2">ครั้ง</th>
                    <th className="text-right pr-2">ต้นทุน</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.per.map((p) => (
                    <tr key={p.code} className="border-b hover:bg-muted/30">
                      <td className="py-1.5 pr-2">
                        {p.name}
                        {isJunior(p.status) && <Badge variant="outline" className="text-[9px] ml-1 bg-amber-50 text-amber-700">ทดลองงาน</Badge>}
                        {isGone(p.status) && <Badge variant="outline" className="text-[9px] ml-1 bg-slate-100 text-slate-600">พ้นสภาพ</Badge>}
                      </td>
                      <td className="pr-2 text-xs text-muted-foreground">{p.department}</td>
                      <td className="text-right pr-2 font-medium">{p.totalH}</td>
                      <td className={`text-right pr-2 ${(p.holidayWorkH + p.holidayOtH) > 20 ? 'text-red-600 font-medium' : ''}`}>
                        {Math.round((p.holidayWorkH + p.holidayOtH) * 10) / 10}
                      </td>
                      <td className="text-right pr-2 text-muted-foreground">{p.occ}</td>
                      <td className="text-right pr-2">\u0E3F{fmtTHB(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีข้อมูล</p>
          )}
        </CardContent>
      </Card>

      {/* Drivers */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-2">ต้นเหตุ (Cause)</h2>
            {byCause.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCause} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="cause" type="category" width={90} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => `${v} ชม.`} />
                      <Bar dataKey="hours" fill="#0f766e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-muted-foreground">แท็ก cause ด้านล่างเพื่อให้ diagnose ได้ (untagged = ยังไม่ระบุ)</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-2">ลูกค้าที่ก่อ OT สูงสุด</h2>
            {byCustomer.length > 0 ? (
              <div className="space-y-1 text-sm max-h-[220px] overflow-auto">
                {byCustomer.map((c, i) => (
                  <div key={i} className="flex justify-between border-b py-1">
                    <span className="truncate pr-2">{c.customer}</span>
                    <span className="text-muted-foreground shrink-0">{c.hours} ชม.</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cause tagging */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-2">แท็กต้นเหตุ (Untagged)</h2>
          <OtCauseTagger entries={scoped.filter((e) => !e.cause_code)} onTagged={refetch} />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, sub, tone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="w-4 h-4" />{label}</div>
        <div className={`text-2xl font-bold ${tone || ''}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}