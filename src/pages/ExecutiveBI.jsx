import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import PeriodSelector from '@/components/shared/PeriodSelector';
import { defaultPeriodState, resolvePeriod, resolveComparison, shiftPeriod } from '@/utils/periodUtils';
import { computeFirmHealth } from '@/utils/firmHealth';
import { buildAttentionFlags } from '@/utils/attentionFlags';
import { aggregateByPerson } from '@/utils/overtimeKpi';
import { buildTalentMatrix } from '@/utils/talentMatrix';
import FirmHealthHero from '@/components/executive/FirmHealthHero';
import FinancialStrip from '@/components/executive/FinancialStrip';
import AttentionQueue from '@/components/executive/AttentionQueue';
import TalentMatrix9Box from '@/components/executive/TalentMatrix9Box';
import PerformerLeaderboard from '@/components/executive/PerformerLeaderboard';

const list = (E, sort = '-created_date', n = 2000) => base44.entities[E].list(sort, n);

export default function ExecutiveBI() {
  const [period, setPeriod] = useState(() => {
    const s = defaultPeriodState();
    return { ...s, resolved: resolvePeriod(s), comparisonResolved: resolveComparison(s.comparison, s) };
  });

  const { data: users = [] } = useUserList();
  const { data: tasks = [], isLoading: l1 }        = useQuery({ queryKey: ['exec-tasks'], queryFn: () => list('Task'), staleTime: 5 * 60_000 });
  const { data: timeEntries = [], isLoading: l2 }   = useQuery({ queryKey: ['exec-time'], queryFn: () => list('TimeEntry', '-start_time'), staleTime: 5 * 60_000 });
  const { data: meetingNotes = [] }                  = useQuery({ queryKey: ['exec-meetings'], queryFn: () => list('MeetingNote'), staleTime: 5 * 60_000 });
  const { data: billings = [] }                      = useQuery({ queryKey: ['exec-billing'], queryFn: () => list('Billing'), staleTime: 5 * 60_000 });
  const { data: skills = [] }                        = useQuery({ queryKey: ['exec-skills'], queryFn: () => list('SkillEntry'), staleTime: 5 * 60_000 });
  const { data: pulses = [] }                        = useQuery({ queryKey: ['exec-pulse'], queryFn: () => list('PulseResponse'), staleTime: 5 * 60_000 });
  const { data: shoutOuts = [] }                     = useQuery({ queryKey: ['exec-shout'], queryFn: () => list('ShoutOut'), staleTime: 5 * 60_000 });
  const { data: kb = [] }                            = useQuery({ queryKey: ['exec-kb'], queryFn: () => list('KnowledgeArticle'), staleTime: 5 * 60_000 });
  const { data: configs = [] }                       = useQuery({ queryKey: ['exec-config'], queryFn: () => base44.entities.AppConfig.list(), staleTime: 60_000 });
  const { data: otEntries = [] }                     = useQuery({ queryKey: ['exec-ot'], queryFn: () => list('OvertimeEntry', '-ot_date', 5000), staleTime: 5 * 60_000 });

  const config = useMemo(() => {
    const map = {};
    configs.forEach((c) => { try { map[c.key] = JSON.parse(c.value); } catch (_e) { map[c.key] = c.value; } });
    return map;
  }, [configs]);
  const fiscalStart = Number(config.fiscal_start_month) || 1;

  const cur = period.resolved;
  const cmp = period.comparisonResolved;

  const health = useMemo(() => cur?.from && cur?.to ? computeFirmHealth({ users, tasks, timeEntries, meetingNotes, billings, from: cur.from, to: cur.to, config }) : null,
    [users, tasks, timeEntries, meetingNotes, billings, cur, config]);
  const healthPrev = useMemo(() => cmp?.from && cmp?.to ? computeFirmHealth({ users, tasks, timeEntries, meetingNotes, billings, from: cmp.from, to: cmp.to, config }) : null,
    [users, tasks, timeEntries, meetingNotes, billings, cmp, config]);

  const trend = useMemo(() => {
    if (!cur?.from) return [];
    const pts = []; let st = { ...period };
    for (let i = 0; i < 6; i++) {
      const r = resolvePeriod(st, fiscalStart);
      pts.unshift({ label: r.label, score: computeFirmHealth({ users, tasks, timeEntries, meetingNotes, billings, from: r.from, to: r.to, config }).overall });
      st = shiftPeriod(st, -1);
    }
    return pts;
  }, [period, users, tasks, timeEntries, meetingNotes, billings, config, fiscalStart]);

  const overtimeByEmail = useMemo(() => {
    if (!cur?.from) return {};
    const scopedOt = otEntries.filter((e) => e.ot_date >= cur.from && e.ot_date <= cur.to);
    const perPerson = aggregateByPerson({ entries: scopedOt, users });
    const map = {};
    perPerson.forEach((p) => { if (p.email) map[p.email] = { hours: p.totalH, holidayHours: Math.round((p.holidayWorkH + p.holidayOtH) * 10) / 10 }; });
    return map;
  }, [otEntries, users, cur]);

  const flags = useMemo(() => cur?.from ? buildAttentionFlags({ users, tasks, timeEntries, meetingNotes, pulses, from: cur.from, to: cur.to, compareFrom: cmp?.from, compareTo: cmp?.to, overtimeByEmail }) : [],
    [users, tasks, timeEntries, meetingNotes, pulses, cur, cmp, overtimeByEmail]);

  const matrix = useMemo(() => cur?.from ? buildTalentMatrix({ users, tasks, timeEntries, meetingNotes, skills, pulses, shoutOuts, knowledgeArticles: kb, from: cur.from, to: cur.to }) : [],
    [users, tasks, timeEntries, meetingNotes, skills, pulses, shoutOuts, kb, cur]);

  const loading = l1 || l2;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive BI Cockpit</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมเชิงกลยุทธ์ของทั้งบริษัท — {cur?.label}</p>
      </div>

      <PeriodSelector value={period} onChange={setPeriod} fiscalStart={fiscalStart} />

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">กำลังโหลดข้อมูล...</div>
      ) : health ? (
        <>
          <FirmHealthHero health={health} prev={healthPrev} trend={trend} periodLabel={cur?.label} compareLabel={cmp?.label} />
          <FinancialStrip fin={health.financial} prevFin={healthPrev?.financial} />
          <AttentionQueue flags={flags} />
          <TalentMatrix9Box matrix={matrix} />
          <PerformerLeaderboard ranked={health.ranked} />
        </>
      ) : null}
    </div>
  );
}