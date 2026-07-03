import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
import { Award, Save, FileDown, TrendingUp, CalendarPlus, Lock, Loader2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import PeriodSelector from '@/components/shared/PeriodSelector';
import { defaultPeriodState, resolvePeriod, resolveComparison, shiftPeriod } from '@/utils/periodUtils';
import { computeScorecard3E } from '@/utils/staffKpi';
import { computePeerContext, generateEvaluationInsights } from '@/utils/evaluationInsights';
import { elementToPdfBlob, downloadBlob } from '@/utils/reportExport';
import StaffScorecard from '@/components/analytics/StaffScorecard';
import ScoreGradeBadge from '@/components/analytics/ScoreGradeBadge';
import EvaluationReport from '@/components/report/EvaluationReport';

const list = (E, s = '-created_date', n = 2000) => base44.entities[E].list(s, n);
const TONE = {
  green: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
  red: 'bg-red-100 text-red-700 border-red-300',
};

export default function PerformanceEvaluation() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: users = [] } = useUserList();
  const activeUsers = useMemo(() => users.filter((u) => u.user_status !== 'inactive'), [users]);
  const [email, setEmail] = useState('');
  const [period, setPeriod] = useState(() => {
    const s = defaultPeriodState();
    return { ...s, resolved: resolvePeriod(s), comparisonResolved: resolveComparison(s.comparison, s) };
  });
  const [busy, setBusy] = useState(null);
  const [lockOnSave, setLockOnSave] = useState(false);
  const reportRef = useRef(null);

  // Shared cache with embedded StaffScorecard (identical queryKeys)
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks_kpi'], queryFn: () => list('Task', '-created_date', 2000), staleTime: 60_000 });
  const { data: meetingNotes = [] } = useQuery({ queryKey: ['meetingNotes_kpi'], queryFn: () => list('MeetingNote', '-created_date', 1000), staleTime: 60_000 });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries_kpi'],
    queryFn: async () => { try { return await list('TimeEntry', '-created_date', 5000); } catch (_e) { return []; } },
    staleTime: 60_000,
  });
  const { data: configs = [] } = useQuery({ queryKey: ['eval-config'], queryFn: () => base44.entities.AppConfig.list(), staleTime: 60_000 });
  const { data: snapshots = [], refetch: refetchSnaps } = useQuery({
    queryKey: ['perf-snaps', email],
    queryFn: () => email ? base44.entities.PerformanceSnapshot.filter({ staff_email: email }, '-created_date', 50) : [],
    enabled: !!email,
  });

  const config = useMemo(() => {
    const map = {};
    configs.forEach((c) => { try { map[c.key] = JSON.parse(c.value); } catch (_e) { map[c.key] = c.value; } });
    return map;
  }, [configs]);
  const fiscalStart = Number(config.fiscal_start_month) || 1;

  const staff = useMemo(() => activeUsers.find((u) => u.email === email) || null, [activeUsers, email]);
  const cur = period.resolved;
  const cmp = period.comparisonResolved;

  // Replicate embedded component's filtering EXACTLY so numbers reconcile
  const scoreForWindow = (from, to) => {
    if (!from || !to || !staff) return null;
    const ft = tasks.filter((t) => { const d = t.created_date?.slice(0, 10) || ''; return d >= from && d <= to; });
    const fe = timeEntries.filter((e) => { const d = e.start_time?.slice(0, 10) || ''; return d >= from && d <= to; });
    return computeScorecard3E({ email, role: staff?.role || 'staff', tasks: ft, timeEntries: fe, meetingNotes, user: staff, from, to });
  };

  const scorecard = useMemo(() => email && cur ? scoreForWindow(cur.from, cur.to) : null, [email, cur, tasks, timeEntries, meetingNotes, staff]);
  const compScore = useMemo(() => email && cmp ? scoreForWindow(cmp.from, cmp.to) : null, [email, cmp, tasks, timeEntries, meetingNotes, staff]);

  // Peer context — same window filtering for every teammate
  const peer = useMemo(() => {
    if (!email || !cur?.from) return null;
    const ft = tasks.filter((t) => { const d = t.created_date?.slice(0, 10) || ''; return d >= cur.from && d <= cur.to; });
    const fe = timeEntries.filter((e) => { const d = e.start_time?.slice(0, 10) || ''; return d >= cur.from && d <= cur.to; });
    return computePeerContext({ users: activeUsers, tasks: ft, timeEntries: fe, meetingNotes, from: cur.from, to: cur.to });
  }, [email, activeUsers, tasks, timeEntries, meetingNotes, cur]);

  // Longitudinal trend — trailing 6 windows
  const trend = useMemo(() => {
    if (!email || !staff) return [];
    const pts = [];
    let st = { ...period };
    for (let i = 0; i < 6; i++) {
      const r = resolvePeriod(st, fiscalStart);
      const sc = scoreForWindow(r.from, r.to);
      pts.unshift({ label: r.label, score: sc?.overall || 0 });
      st = shiftPeriod(st, -1);
    }
    return pts;
  }, [email, period, tasks, timeEntries, meetingNotes, staff, fiscalStart]);

  const insights = useMemo(
    () => email && scorecard && peer ? generateEvaluationInsights({ scorecard, peer, trend, email }) : null,
    [email, scorecard, peer, trend]
  );

  const delta = compScore ? scorecard.overall - compScore.overall : null;
  const meta = {
    viewerName: currentUser?.nickname || currentUser?.full_name || currentUser?.email || '',
    generatedAt: new Date().toLocaleString('th-TH'),
  };

  // ── Actions ──
  const doSnapshot = async () => {
    setBusy('snap');
    try {
      await base44.entities.PerformanceSnapshot.create({
        staff_email: email,
        staff_name: staff.nickname || staff.full_name || staff.email,
        role: staff.role,
        department: staff.department,
        period_type: period.type,
        period_key: cur.key,
        period_from: cur.from,
        period_to: cur.to,
        comparison_baseline: period.comparison,
        overall_score: scorecard.overall,
        grade: scorecard.grade.letter,
        e1_score: scorecard.dimensions.execution.score,
        e2_score: scorecard.dimensions.effectiveness.score,
        e3_score: scorecard.dimensions.efficiency.score,
        dimensions_json: JSON.stringify(scorecard),
        insights_json: JSON.stringify(insights),
        recommended_action: insights.recommendedAction,
        compensation_signal: insights.compensationSignal,
        locked: lockOnSave,
        generated_by: currentUser?.email,
        generated_by_name: meta.viewerName,
      });
      await refetchSnaps();
      toast({ title: lockOnSave ? 'บันทึก snapshot แบบล็อก (immutable) แล้ว' : 'บันทึก snapshot แล้ว' });
    } catch (e) {
      toast({ title: 'บันทึกไม่สำเร็จ', description: e.message, variant: 'destructive' });
    }
    setBusy(null);
  };

  const doPdf = async () => {
    setBusy('pdf');
    try {
      await document.fonts?.ready;
      const blob = await elementToPdfBlob(reportRef.current);
      downloadBlob(blob, `Evaluation_${staff.nickname || email}_${cur.key}.pdf`);
      toast({ title: 'ดาวน์โหลด PDF เรียบร้อย' });
    } catch (_e) {
      toast({ title: 'สร้าง PDF ไม่สำเร็จ', variant: 'destructive' });
    }
    setBusy(null);
  };

  const doPromotion = async () => {
    setBusy('promo');
    try {
      await base44.entities.User.update(staff.id, {
        promotion_watch: true,
        promotion_watch_note: `Flagged ${cur.label} · score ${scorecard.overall} · ${insights.recommendedAction}`,
      });
      toast({ title: 'ติดตามเพื่อพิจารณาเลื่อนตำแหน่งแล้ว' });
    } catch (e) {
      toast({ title: 'ไม่สำเร็จ', description: e.message, variant: 'destructive' });
    }
    setBusy(null);
  };

  const doOneOnOne = async () => {
    setBusy('meet');
    try {
      await base44.entities.MeetingNote.create({
        title: `1-on-1 · ${staff.nickname || staff.full_name} · ${cur.label}`,
        meeting_date: new Date().toISOString().slice(0, 10),
        manager_email: currentUser?.email,
        manager_name: meta.viewerName,
        staff_email: email,
        staff_name: staff.nickname || staff.full_name,
        notes: `ประเด็นจากการประเมิน:\n- ${insights.development.join('\n- ') || 'ทบทวนผลงานทั่วไป'}`,
        status: 'open',
      });
      toast({ title: 'สร้างบันทึก 1-on-1 (ร่าง) แล้ว — ดูที่ Meeting Notes' });
    } catch (e) {
      toast({ title: 'ไม่สำเร็จ', description: e.message, variant: 'destructive' });
    }
    setBusy(null);
  };

  const DeltaChip = ({ v }) => {
    if (v == null) return null;
    const cls = v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : 'text-muted-foreground';
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${cls}`}>
        {v > 0 ? <ArrowUp className="w-3 h-3" /> : v < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        {Math.abs(v)} vs {cmp?.label}
      </span>
    );
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Individual Performance Evaluation</h1>
        <p className="text-sm text-muted-foreground">เครื่องมือประเมินระดับบุคคล — ใช้ประกอบค่าตอบแทน · เลื่อนตำแหน่ง · PIP</p>
      </div>

      {/* Staff Selector */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <select
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-md border px-3 text-sm bg-background min-w-[240px]"
          >
            <option value="">— เลือกพนักงาน —</option>
            {activeUsers.map((u) => (
              <option key={u.email} value={u.email}>{u.nickname || u.full_name || u.email} · {u.position || u.role}</option>
            ))}
          </select>
          {staff && (
            <Badge variant="secondary">
              {staff.role}{staff.promotion_watch ? ' · ⭐ promotion watch' : ''}
            </Badge>
          )}
        </CardContent>
      </Card>

      {!email && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">เลือกพนักงานเพื่อเริ่มการประเมิน</CardContent>
        </Card>
      )}

      {email && scorecard && insights && peer && (
        <>
          <PeriodSelector value={period} onChange={setPeriod} fiscalStart={fiscalStart} />

          {/* Evaluation Summary */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-emerald-600">{scorecard.overall}</div>
                  <ScoreGradeBadge grade={scorecard.grade} size="lg" />
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  {insights.rank && (
                    <div className="text-sm">อันดับ <b>#{insights.rank.rank}</b> จาก {insights.rank.of} · peer median {peer.peerMedian.overall}</div>
                  )}
                  <DeltaChip v={delta} />
                  <div className="flex items-center gap-2 pt-1">
                    <Award className="w-4 h-4" />
                    <Badge variant="outline" className={TONE[insights.actionTone]}>{insights.recommendedAction}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">สัญญาณค่าตอบแทน: {insights.compensationSignal}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Longitudinal Trend */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h2 className="font-semibold">แนวโน้มระยะยาว</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {insights.trajectory.direction === 'improving' ? '▲ พัฒนา' : insights.trajectory.direction === 'declining' ? '▼ ลดลง' : '▬ คงที่'}
                  {insights.trajectory.delta != null ? ` (${insights.trajectory.delta > 0 ? '+' : ''}${insights.trajectory.delta})` : ''}
                </span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ left: -20, right: 10, top: 6 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => `${v}/100`} />
                    <ReferenceLine
                      y={peer.peerMedian.overall}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{ value: `peer ${peer.peerMedian.overall}`, fontSize: 10, position: 'right' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Dimensional deep-dive — reuse existing component */}
          <StaffScorecard email={email} role={staff.role} from={cur.from} to={cur.to} user={staff} />

          {/* Auto-Insights */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold">บทวิเคราะห์อัตโนมัติ (Evaluation Insights)</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-emerald-700 mb-1">✅ จุดแข็ง</div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {insights.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    {!insights.strengths.length && <li>—</li>}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-amber-700 mb-1">⚠️ ประเด็นพัฒนา</div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {insights.development.map((s, i) => <li key={i}>{s}</li>)}
                    {!insights.development.length && <li>ไม่มีประเด็นเด่น</li>}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-indigo-700 mb-1">🎯 แนวทางโค้ช</div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {insights.coaching.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Actions */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold">การดำเนินการ (Evaluation Actions)</h2>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={lockOnSave} onChange={(e) => setLockOnSave(e.target.checked)} />
                <Lock className="w-3.5 h-3.5" />
                ล็อกเป็นบันทึกทางการ (immutable — ใช้ประกอบค่าตอบแทน/เลื่อนตำแหน่ง)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={doSnapshot} disabled={!!busy}>
                  {busy === 'snap' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  บันทึก Snapshot
                </Button>
                <Button variant="outline" onClick={doPdf} disabled={!!busy}>
                  {busy === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                  สร้างรายงานประเมิน (PDF)
                </Button>
                <Button variant="outline" onClick={doPromotion} disabled={!!busy}>
                  <Award className="w-4 h-4 mr-2" />Track for Promotion
                </Button>
                <Button variant="outline" onClick={doOneOnOne} disabled={!!busy}>
                  <CalendarPlus className="w-4 h-4 mr-2" />สร้าง 1-on-1
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Snapshot History */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-3">ประวัติ Snapshot (Immutable Records)</h2>
              <div className="divide-y">
                {snapshots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        {s.period_key} · {s.overall_score} ({s.grade})
                        {s.locked && <Lock className="w-3 h-3 text-slate-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.recommended_action} · {s.generated_by_name} · {new Date(s.created_date).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{s.locked ? 'ล็อก' : 'live'}</Badge>
                  </div>
                ))}
                {!snapshots.length && <p className="text-sm text-muted-foreground">ยังไม่มี snapshot สำหรับพนักงานคนนี้</p>}
              </div>
            </CardContent>
          </Card>

          {/* Off-screen capture target for PDF */}
          <div style={{ position: 'fixed', left: -10000, top: 0 }}>
            <EvaluationReport
              ref={reportRef}
              staff={{ name: staff.nickname || staff.full_name || staff.email, position: staff.position, role: staff.role }}
              period={{ from: cur.from, to: cur.to }}
              scorecard={scorecard}
              insights={insights}
              meta={meta}
            />
          </div>
        </>
      )}
    </div>
  );
}