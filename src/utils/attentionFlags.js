import { computeScorecard3E } from './staffKpi';

const MOOD_RISK = { burned_out: 2, stressed: 1 };

export function buildAttentionFlags({ users, tasks, timeEntries, meetingNotes, pulses = [], from, to, compareFrom, compareTo, overtimeByEmail = {} }) {
  const flags = [];
  users.filter((u) => u.user_status !== 'inactive').forEach((u) => {
    const cur = computeScorecard3E({ email: u.email, role: u.role || 'staff', tasks, timeEntries, meetingNotes, user: u, from, to });
    if (!cur.has_sufficient_data) return;
    const prev = (compareFrom && compareTo)
      ? computeScorecard3E({ email: u.email, role: u.role || 'staff', tasks, timeEntries, meetingNotes, user: u, from: compareFrom, to: compareTo })
      : null;
    const name = u.nickname || u.full_name || u.email;
    const ex = cur.dimensions.execution, ef = cur.dimensions.effectiveness, ey = cur.dimensions.efficiency;

    if (prev?.has_sufficient_data && (prev.overall - cur.overall) >= 8)
      flags.push({ email: u.email, name, severity: 'high', type: 'performance_drop',
        reason: `คะแนนรวมลดลง ${prev.overall - cur.overall} จุด (${prev.overall}→${cur.overall})`, action: 'นัด 1-on-1 ทบทวนสาเหตุ' });

    const risk = pulses.filter((p) => p.user_email === u.email).reduce((s, p) => s + (MOOD_RISK[p.mood] || 0), 0);
    const highUtil = ex.utilization_rate > 0.95;
    if (risk >= 2 || (risk >= 1 && highUtil))
      flags.push({ email: u.email, name, severity: risk >= 2 ? 'high' : 'medium', type: 'burnout_risk',
        reason: `Mood เสี่ยง (${risk} สัญญาณ)${highUtil ? ` + utilization ${Math.round(ex.utilization_rate * 100)}%` : ''}`, action: 'ตรวจ workload; พิจารณา redistribute' });

    if (ey.overdue_open >= 3)
      flags.push({ email: u.email, name, severity: ey.overdue_open >= 5 ? 'high' : 'medium', type: 'overdue_pileup',
        reason: `งานเลยกำหนดค้าง ${ey.overdue_open} รายการ`, action: 'จัดลำดับความสำคัญ; ช่วย unblock' });

    if (ef.critical_finding_rate > 0 || ef.rework_rate > 0.15)
      flags.push({ email: u.email, name, severity: ef.critical_finding_rate > 0 ? 'high' : 'medium', type: 'quality_slip',
        reason: `${ef.critical_finding_rate > 0 ? 'พบ critical finding · ' : ''}rework ${Math.round(ef.rework_rate * 100)}%`, action: 'Review งานล่าสุด; เสริม checklist/coaching' });

    const ot = overtimeByEmail[u.email];
    if (ot && (ot.hours >= 30 || ot.holidayHours > 0)) {
      flags.push({ email: u.email, name, severity: ot.holidayHours > 8 ? 'high' : 'medium', type: 'overtime_burnout',
        reason: `OT ${ot.hours} ชม.${ot.holidayHours > 0 ? ` (วันหยุด ${ot.holidayHours} ชม.)` : ''} ในงวดนี้`,
        action: 'ทบทวน workload/capacity; ตรวจต้นเหตุใน OT Analytics' });
    }
  });
  const order = { high: 0, medium: 1, low: 2 };
  return flags.sort((a, b) => order[a.severity] - order[b.severity]);
}