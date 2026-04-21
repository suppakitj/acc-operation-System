/**
 * Utility helpers for MeetingNote action items — backward compat & permission logic
 */

/** Generate a simple unique id */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Normalize a single action item — lazy backfill missing fields */
export function normalizeActionItem(item) {
  return {
    ...item,
    id: item.id || generateId(),
    original_due_date: item.original_due_date || item.due_date || '',
    postpone_count: item.postpone_count ?? 0,
    postpone_history: item.postpone_history || [],
    pending_postpone: item.pending_postpone || null,
  };
}

/** Normalize all action items on a note */
export function normalizeNote(note) {
  if (!note) return note;
  return {
    ...note,
    action_items: (note.action_items || []).map(normalizeActionItem),
  };
}

/** Permission checks */
export function getItemPermissions(note, item, currentUser) {
  if (!currentUser) return { canClose: false, canPostpone: false, canApprove: false };
  
  const role = currentUser.role || '';
  const email = currentUser.email || '';
  
  const isAdmin = role === 'admin' || role === 'management';
  const isManager = note.manager_email === email;
  const isAssignee = item.assignee_email
    ? item.assignee_email === email
    : (note.staff_emails || []).includes(email);

  const hasPending = !!item.pending_postpone;

  return {
    isAdmin,
    isManager,
    isAssignee,
    canClose: (isAdmin || isManager || isAssignee) && !hasPending,
    canPostpone: (isAdmin || isManager || isAssignee) && !hasPending && !item.done,
    canApprove: (isAdmin || isManager) && hasPending,
    /** Manager/Admin auto-approve; assignee sends request */
    isAutoApprover: isAdmin || isManager,
  };
}

/** Determine card border class for a note */
export function getNoteBorderClass(note) {
  const items = note.action_items || [];
  if (note.status === 'closed') return 'opacity-60 border-l-4 border-l-gray-300';
  const hasOverdue = items.some(a => !a.done && a.due_date && new Date(a.due_date) < new Date());
  const hasPending = items.some(a => a.pending_postpone);
  if (hasOverdue) return 'border-l-4 border-l-red-400';
  if (hasPending) return 'border-l-4 border-l-amber-400';
  return 'border-l-4 border-l-indigo-400';
}