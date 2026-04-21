/**
 * Shared approve/reject helpers for 3E submission_cycles tracking.
 * Used by both Tasks.jsx and MyDay.jsx — single source of truth.
 */

const SEVERITY_WEIGHTS = { minor: 0.5, major: 1.0, critical: 2.0 };

/**
 * Build the extra data fields for an Approve action.
 * Returns an object to spread into the Task.update() payload.
 */
export function buildApprovePayload(task, currentUser) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const cycles = [...(task.submission_cycles || [])];

  // Close pending cycle
  const pendingIdx = cycles.findIndex(c => c.decision === 'pending');
  if (pendingIdx >= 0) {
    const cycle = cycles[pendingIdx];
    const submittedAt = cycle.submitted_at ? new Date(cycle.submitted_at) : now;
    cycles[pendingIdx] = {
      ...cycle,
      decision: 'approved',
      decided_at: now.toISOString(),
      decided_by: currentUser.email,
      decided_by_name: currentUser.full_name || currentUser.email,
      turnaround_hours: Math.round(((now - submittedAt) / 3600000) * 10) / 10,
    };
  }

  // first_time_right — set once, immutable
  const priorRejects = cycles.filter(c => c.decision === 'rejected').length;
  const ftr = task.first_time_right !== undefined ? {} : { first_time_right: priorRejects === 0 };

  return {
    status: 'completed',
    completed_date: today,
    review_status: 'approved',
    reviewer_email: currentUser.email,
    reviewer_name: currentUser.full_name || currentUser.email,
    reviewed_date: today,
    findings: task.findings || [],
    checklist: task.checklist || [],
    submission_cycles: cycles,
    ...ftr,
  };
}

/**
 * Build the extra data fields for a Reject action.
 * Returns an object to spread into the Task.update() payload.
 */
export function buildRejectPayload(task, currentUser, { note, newDueDate, severity = 'major', category = 'other' }) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weight = SEVERITY_WEIGHTS[severity] || 1.0;
  const cycles = [...(task.submission_cycles || [])];

  // Close pending cycle (or create retroactive one)
  const pendingIdx = cycles.findIndex(c => c.decision === 'pending');
  if (pendingIdx >= 0) {
    const cycle = cycles[pendingIdx];
    const submittedAt = cycle.submitted_at ? new Date(cycle.submitted_at) : now;
    cycles[pendingIdx] = {
      ...cycle,
      decision: 'rejected',
      severity,
      category,
      note: note || '',
      decided_at: now.toISOString(),
      decided_by: currentUser.email,
      decided_by_name: currentUser.full_name || currentUser.email,
      turnaround_hours: Math.round(((now - submittedAt) / 3600000) * 10) / 10,
    };
  } else {
    // Retroactive cycle
    const retroSubmit = task.last_submitted_at || task.reviewed_date || now.toISOString();
    cycles.push({
      cycle_no: cycles.length + 1,
      submitted_at: retroSubmit,
      submitted_by: task.assigned_to || '',
      submitted_by_name: task.assigned_name || '',
      decision: 'rejected',
      severity,
      category,
      note: note || '',
      decided_at: now.toISOString(),
      decided_by: currentUser.email,
      decided_by_name: currentUser.full_name || currentUser.email,
      turnaround_hours: 0,
    });
  }

  // rework_count: minor doesn't penalize
  const countIncrement = severity === 'minor' ? 0 : 1;

  // first_time_right — set once
  const ftr = task.first_time_right !== undefined ? {} : { first_time_right: false };

  // Due date change tracking
  const oldDue = task.due_date?.split('T')[0] || '';
  const newDue = newDueDate?.split('T')[0] || '';
  const dueChanged = newDue && oldDue && newDue !== oldDue;

  const dueDateFields = {};
  if (newDue) dueDateFields.due_date = newDue;
  if (dueChanged) {
    const currentHistory = Array.isArray(task.due_date_change_history) ? task.due_date_change_history : [];
    dueDateFields.due_date_change_count = (task.due_date_change_count || 0) + 1;
    dueDateFields.due_date_change_history = [...currentHistory, {
      changed_at: now.toISOString(),
      changed_by: currentUser.email,
      changed_by_name: currentUser.full_name || '',
      changed_by_role: currentUser.role || '',
      old_due_date: oldDue,
      new_due_date: newDue,
      reason: `ส่งกลับ [${severity}]: ${note || 'ไม่ระบุเหตุผล'}`,
    }];
  }

  return {
    status: 'in_progress',
    review_status: 'rejected',
    reviewer_email: currentUser.email,
    reviewer_name: currentUser.full_name || currentUser.email,
    reviewed_date: today,
    review_note: note || '',
    review_deadline: null,
    findings: task.findings || [],
    checklist: task.checklist || [],
    submission_cycles: cycles,
    rework_count: (task.rework_count || 0) + countIncrement,
    rework_count_weighted: Math.round(((task.rework_count_weighted || 0) + weight) * 100) / 100,
    ...ftr,
    ...dueDateFields,
  };
}

/**
 * Build submission cycle entry when status changes to 'review'.
 * Returns fields to merge into the update payload.
 */
export function buildSubmitForReviewPayload(task, currentUser) {
  const now = new Date().toISOString();
  const existingCycles = task.submission_cycles || [];
  // Remove any stale pending cycle
  const cleaned = existingCycles.filter(c => c.decision !== 'pending');
  const newCycle = {
    cycle_no: cleaned.length + 1,
    submitted_at: now,
    submitted_by: currentUser.email,
    submitted_by_name: currentUser.full_name || currentUser.email,
    decision: 'pending',
  };
  return {
    last_submitted_at: now,
    submission_cycles: [...cleaned, newCycle],
  };
}