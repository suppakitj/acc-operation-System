import { computeFirmHealth } from './firmHealth';
import { buildAttentionFlags } from './attentionFlags';


const inRange = (d, from, to) => !!d && d >= from && d <= to;

export function buildKpiReportData({ users, tasks, timeEntries, meetingNotes, billings, pulses, from, to, compareFrom, compareTo, config }) {
  const health = computeFirmHealth({ users, tasks, timeEntries, meetingNotes, billings, from, to, config });
  const healthPrev = (compareFrom && compareTo)
    ? computeFirmHealth({ users, tasks, timeEntries, meetingNotes, billings, from: compareFrom, to: compareTo, config })
    : null;

  const ranked = health.ranked.filter((r) => r.has_sufficient_data);
  const completed = tasks.filter((t) => t.status === 'completed' && inRange(t.completed_date, from, to));
  const onTime = completed.filter((t) => { const due = t.original_due_date || t.due_date; return t.completed_date && due && t.completed_date <= due; });
  const created = tasks.filter((t) => inRange(t.start_date || t.created_date?.slice(0, 10), from, to));
  const overdueOpen = tasks.filter((t) => ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date && t.due_date < to).length;
  const reworkTasks = completed.filter((t) => (t.rework_count || 0) > 0).length;
  const criticalFindings = tasks.filter((t) => (t.findings || []).some((f) => f.severity === 'critical')).length;
  const totalHours = Math.round(timeEntries.filter((e) => inRange((e.start_time || '').slice(0, 10), from, to)).reduce((s, e) => s + (e.duration_minutes || 0), 0) / 60);

  const flags = buildAttentionFlags({ users, tasks, timeEntries, meetingNotes, pulses: pulses || [], from, to, compareFrom, compareTo });
  const nick = (r) => ({ name: r.user.nickname || r.user.full_name || r.user.email, score: r.overall, grade: r.grade.letter });

  return {
    period: { from, to },
    firmHealth: { overall: health.overall, operational: health.components.operational, financial: health.components.financial, prevOverall: healthPrev?.overall ?? null, weights: health.weights },
    financial: {
      totalRevenue: health.financial.totalRevenue, revenuePerFte: health.financial.revenuePerFte,
      grossMarginPct: health.financial.grossMarginPct, costEfficiency: health.financial.costEfficiency,
      totalCost: health.financial.totalCost, unattributedRevenue: health.financial.unattributedRevenue,
      prevRevenue: healthPrev?.financial?.totalRevenue ?? null,
    },
    operations: {
      tasksCompleted: completed.length, tasksCreated: created.length,
      onTimeRate: completed.length ? Math.round((onTime.length / completed.length) * 100) : null,
      overdueOpen, reworkTasks, criticalFindings, totalHours,
    },
    team: {
      headcount: users.filter((u) => u.user_status !== 'inactive').length,
      avg3E: health.components.operational,
      top: ranked.slice(0, 5).map(nick),
      bottom: ranked.slice(-5).map(nick),
    },
    attention: { count: flags.length, high: flags.filter((f) => f.severity === 'high').length, items: flags.slice(0, 8) },
  };
}