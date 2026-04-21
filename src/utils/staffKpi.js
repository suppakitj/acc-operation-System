/**
 * 3E Execution Framework — KPI Compute Library
 * E1: Execution (ทำครบ), E2: Effectiveness (ไม่ผิดพลาด), E3: Efficiency (ตรงเวลา)
 */

const ROLE_WEIGHTS = {
  staff:            { e1: 0.30, e2: 0.45, e3: 0.25 },
  super_supervisor: { e1: 0.25, e2: 0.45, e3: 0.30 },
  manager:          { e1: 0.20, e2: 0.50, e3: 0.30 },
  management:       { e1: 0.15, e2: 0.55, e3: 0.30 },
  admin:            { e1: 0.15, e2: 0.55, e3: 0.30 },
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function diffDays(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(a) - new Date(b)) / 86400000);
}

function getWorkingDays(from, to) {
  let count = 0;
  const d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count || 1;
}

// ─── E1: Execution ───────────────────────────────────────────────

export function computeExecution({ tasks, timeEntries = [], user, email, from, to }) {
  const myTasks = tasks.filter(t => t.assigned_to === email);
  const total_assigned = myTasks.length;
  const completed = myTasks.filter(t => t.status === 'completed').length;
  const cancelled = myTasks.filter(t => t.status === 'cancelled').length;
  const in_flight = myTasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status)).length;
  const completion_rate = total_assigned > 0 ? completed / total_assigned : 0;

  // Hours from TimeEntry
  const myEntries = timeEntries.filter(e => e.user_email === email);
  const total_hours = myEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0) / 60;

  const working_days = getWorkingDays(from, to);
  const available_hours = working_days * 8;
  const utilization_rate = available_hours > 0 ? total_hours / available_hours : 0;

  const capacity = user?.max_tasks || 10;
  const throughput_vs_capacity = completed / capacity;

  // Score: completion_rate 60% + utilization sweet-spot 25% + throughput 15%
  const completionScore = completion_rate * 100;
  // Utilization sweet spot 70-95%
  let utilScore;
  if (utilization_rate >= 0.70 && utilization_rate <= 0.95) utilScore = 100;
  else if (utilization_rate < 0.70) utilScore = (utilization_rate / 0.70) * 100;
  else utilScore = Math.max(0, 100 - (utilization_rate - 0.95) * 500);

  const throughputScore = clamp(throughput_vs_capacity * 100, 0, 100);

  const score = clamp(Math.round(completionScore * 0.60 + utilScore * 0.25 + throughputScore * 0.15), 0, 100);

  return {
    score, total_assigned, completed, cancelled, in_flight,
    completion_rate, total_hours: Math.round(total_hours * 10) / 10,
    utilization_rate, capacity, throughput_vs_capacity,
  };
}

// ─── E2: Effectiveness ──────────────────────────────────────────

export function computeEffectiveness({ tasks, email, from, to }) {
  const myTasks = tasks.filter(t => t.assigned_to === email);
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const totalReviewed = myTasks.filter(t => t.review_status === 'approved' || t.review_status === 'rejected' || t.status === 'completed').length;

  // Rework: tasks where rework_count > 0 OR review was rejected
  const reworkCount = (t) => t.rework_count || 0;
  const reworkedTasks = myTasks.filter(t => reworkCount(t) > 0);
  const rework_rate = totalReviewed > 0 ? reworkedTasks.length / totalReviewed : 0;

  // First time right
  const ftrTasks = completedTasks.filter(t => t.first_time_right !== undefined);
  const ftrRight = ftrTasks.filter(t => t.first_time_right === true).length;
  const first_time_right_rate = ftrTasks.length > 0 ? ftrRight / ftrTasks.length : (totalReviewed > 0 ? 1 - rework_rate : 1);

  const avg_rework_count = totalReviewed > 0
    ? myTasks.reduce((s, t) => s + reworkCount(t), 0) / totalReviewed
    : 0;

  // Weighted rework
  const total_weighted_rework = myTasks.reduce((s, t) => s + (t.rework_count_weighted || 0), 0);
  const avg_weighted_rework = totalReviewed > 0 ? total_weighted_rework / totalReviewed : 0;

  // Critical findings from findings array
  const tasksWithFindings = myTasks.filter(t => (t.findings || []).length > 0);
  const criticalFindings = myTasks.filter(t =>
    (t.findings || []).some(f => f.severity === 'critical')
  );
  const critical_finding_rate = myTasks.length > 0 ? criticalFindings.length / myTasks.length : 0;

  // Severity breakdown from submission_cycles or findings
  const severity_breakdown = { minor: 0, major: 0, critical: 0 };
  const category_breakdown = {};

  myTasks.forEach(t => {
    // From submission_cycles if available
    (t.submission_cycles || []).forEach(c => {
      if (c.decision === 'rejected' && c.severity) {
        const sev = c.severity === 'low' ? 'minor' : c.severity === 'medium' ? 'major' : c.severity;
        if (severity_breakdown[sev] !== undefined) severity_breakdown[sev]++;
        if (c.category) category_breakdown[c.category] = (category_breakdown[c.category] || 0) + 1;
      }
    });
    // Fallback: from findings
    (t.findings || []).forEach(f => {
      const sev = f.severity === 'low' ? 'minor' : f.severity === 'medium' ? 'major' : f.severity;
      if (severity_breakdown[sev] !== undefined) severity_breakdown[sev]++;
    });
  });

  // Score: start 100, deduct
  let score = 100;
  score -= clamp(rework_rate * 100, 0, 35);
  score -= clamp(avg_weighted_rework * 10, 0, 20);
  score -= clamp(critical_finding_rate * 100, 0, 15);
  if (first_time_right_rate > 0.80) score += 5;
  score = clamp(Math.round(score), 0, 100);

  return {
    score, rework_rate, first_time_right_rate,
    avg_rework_count: Math.round(avg_rework_count * 100) / 100,
    total_weighted_rework: Math.round(total_weighted_rework * 100) / 100,
    avg_weighted_rework: Math.round(avg_weighted_rework * 100) / 100,
    reworked_tasks: reworkedTasks.length,
    reviewed_tasks: totalReviewed,
    critical_finding_rate,
    severity_breakdown,
    category_breakdown,
  };
}

// ─── E3: Efficiency ─────────────────────────────────────────────

export function computeEfficiency({ tasks, meetingNotes = [], email, from, to }) {
  const myTasks = tasks.filter(t => t.assigned_to === email);
  const completedTasks = myTasks.filter(t => t.status === 'completed');

  // On-time: completed_date <= original_due_date (or due_date as fallback)
  const getOriginalDue = (t) => {
    if (t.original_due_date) return t.original_due_date;
    const history = t.due_date_change_history || [];
    if (history.length > 0) return history[0].old_due_date || t.due_date;
    return t.due_date;
  };

  const onTimeTasks = completedTasks.filter(t => {
    const orig = getOriginalDue(t);
    if (!orig || !t.completed_date) return true; // no data = assume on time
    return t.completed_date <= orig;
  });
  const on_time_rate = completedTasks.length > 0 ? onTimeTasks.length / completedTasks.length : 1;

  // Avg slippage
  const slippages = myTasks
    .map(t => {
      const orig = getOriginalDue(t);
      if (!orig || !t.due_date || orig === t.due_date) return null;
      return diffDays(t.due_date, orig);
    })
    .filter(v => v !== null && v > 0);
  const avg_slippage_days = slippages.length > 0 ? slippages.reduce((a, b) => a + b, 0) / slippages.length : 0;

  // Postpone ratio
  const postponedTasks = myTasks.filter(t => (t.due_date_change_count || 0) > 0);
  const postpone_ratio = myTasks.length > 0 ? postponedTasks.length / myTasks.length : 0;

  // Overdue open
  const now = new Date().toISOString().slice(0, 10);
  const overdue_open = myTasks.filter(t =>
    ['pending', 'in_progress', 'review'].includes(t.status) && t.due_date && t.due_date < now
  ).length;

  // Meeting action items on-time
  let meetingOnTime = 0;
  let meetingTotal = 0;
  meetingNotes.forEach(note => {
    (note.action_items || []).forEach(item => {
      if (item.assignee_email !== email) return;
      if (!item.done) return;
      meetingTotal++;
      const origDue = item.original_due_date || item.due_date;
      if (item.closed_at && origDue && item.closed_at.slice(0, 10) <= origDue) {
        meetingOnTime++;
      }
    });
  });
  const meeting_action_on_time = meetingTotal > 0 ? meetingOnTime / meetingTotal : 1;

  // Combined on-time
  const combinedOnTime = onTimeTasks.length + meetingOnTime;
  const combinedTotal = completedTasks.length + meetingTotal;
  const combined_on_time_rate = combinedTotal > 0 ? combinedOnTime / combinedTotal : 1;

  // Score
  let score = 100;
  score -= clamp((1 - combined_on_time_rate) * 70, 0, 50);
  score -= clamp(avg_slippage_days * 4, 0, 20);
  score -= clamp(postpone_ratio * 60, 0, 15);
  score -= clamp(overdue_open * 3, 0, 15);
  score = clamp(Math.round(score), 0, 100);

  return {
    score, on_time_rate, on_time_count: onTimeTasks.length,
    avg_slippage_days: Math.round(avg_slippage_days * 10) / 10,
    postpone_ratio, postponed_count: postponedTasks.length,
    overdue_open,
    meeting_action_on_time, meeting_on_time: meetingOnTime, meeting_total: meetingTotal,
    combined_on_time_rate,
  };
}

// ─── Grade ──────────────────────────────────────────────────────

export function gradeOverall(score) {
  if (score >= 90) return { letter: 'A+', label: 'Outstanding', color: 'emerald' };
  if (score >= 80) return { letter: 'A', label: 'Excellent', color: 'green' };
  if (score >= 70) return { letter: 'B', label: 'Good', color: 'blue' };
  if (score >= 60) return { letter: 'C', label: 'Fair', color: 'amber' };
  if (score >= 50) return { letter: 'D', label: 'Below expectations', color: 'orange' };
  return { letter: 'F', label: 'Unsatisfactory', color: 'red' };
}

// ─── Main Composer ──────────────────────────────────────────────

export function computeScorecard3E({ email, role, tasks, timeEntries, meetingNotes, user, from, to }) {
  const execution = computeExecution({ tasks, timeEntries, user, email, from, to });
  const effectiveness = computeEffectiveness({ tasks, email, from, to });
  const efficiency = computeEfficiency({ tasks, meetingNotes, email, from, to });

  const weights = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.staff;
  const overall = Math.round(
    execution.score * weights.e1 +
    effectiveness.score * weights.e2 +
    efficiency.score * weights.e3
  );

  const grade = gradeOverall(overall);
  const has_sufficient_data = execution.total_assigned >= 5;

  return {
    overall, grade, weights, has_sufficient_data,
    dimensions: { execution, effectiveness, efficiency },
  };
}

// ─── Team Ranking ───────────────────────────────────────────────

export function rankTeam3E({ users, tasks, timeEntries, meetingNotes, from, to }) {
  const results = users.map(u => {
    const scorecard = computeScorecard3E({
      email: u.email, role: u.role || 'staff',
      tasks, timeEntries, meetingNotes, user: u, from, to,
    });
    return { ...scorecard, user: u };
  });

  return results.sort((a, b) => b.overall - a.overall);
}