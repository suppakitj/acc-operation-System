import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

const MANAGER_ROLES = ['admin', 'management', 'manager'];
const REVIEWER_ROLES = ['admin', 'management', 'manager', 'super_supervisor'];

function checklistStatus(task) {
  const list = Array.isArray(task.checklist) ? task.checklist : [];
  const checked = list.filter(i => i && i.checked).length;
  return { total: list.length, checked, complete: list.length === 0 || checked === list.length };
}

function openCycle(task, me, myName) {
  const cycles = Array.isArray(task.submission_cycles) ? [...task.submission_cycles] : [];
  if (cycles.some(c => c && c.decision === 'pending')) return cycles;
  cycles.push({
    cycle_no: cycles.length + 1,
    submitted_at: new Date().toISOString(),
    submitted_by: me,
    submitted_by_name: myName,
    decision: 'pending',
  });
  return cycles;
}

function bkkToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export default async function(req) {
  const base44 = createClientFromRequest(req);
  let user;
  try { user = await base44.auth.me(); } catch (_) { user = null; }
  if (!user?.email) return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

  try {
    const { task_id, action, note } = await req.json();
    const Task = base44.asServiceRole.entities.Task;
    const task = await Task.get(task_id);
    if (!task) return Response.json({ ok: false, reason: 'not_found' });

    const me = user.email;
    const myName = user.full_name || me;
    const isOwner = task.assigned_to === me;
    let update = null;
    let warning = null;

    if (action === 'claim') {
      if (task.assigned_to && !isOwner) {
        return Response.json({ ok: false, reason: 'taken', taken_by: task.assigned_name || task.assigned_to });
      }
      const inProgress = await Task.count({ assigned_to: me, status: 'in_progress' });
      const maxTasks = Number(user.max_tasks) || 0;
      if (maxTasks > 0 && inProgress >= maxTasks) {
        warning = `คุณมีงานกำลังทำ ${inProgress} งาน (เพดาน ${maxTasks})`;
      }
      update = {
        assigned_to: me, assigned_name: myName,
        claimed_at: new Date().toISOString(), claimed_by: me, claimed_by_name: myName,
        status: 'in_progress', is_open_pool: false, last_change_source: 'board_claim',
      };
      if (!task.start_date) update.start_date = bkkToday();
    } else if (action === 'release') {
      if (!isOwner && !MANAGER_ROLES.includes(user.role)) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
      update = {
        assigned_to: '', assigned_name: '', status: 'pending', is_open_pool: true,
        claimed_at: '', claimed_by: '', claimed_by_name: '', last_change_source: 'board_release',
      };
    } else if (action === 'start') {
      if (!isOwner) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
      if (task.status !== 'pending' && task.status !== 'waiting_client') return Response.json({ ok: false, reason: 'invalid_status' });
      update = { status: 'in_progress', last_change_source: 'board_claim' };
      if (!task.start_date) update.start_date = bkkToday();
    } else if (action === 'waiting_client') {
      if (!isOwner) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
      update = { status: 'waiting_client', last_change_source: 'board_claim' };
      if (!task.waiting_client_since) update.waiting_client_since = new Date().toISOString();
    } else if (action === 'submit_review') {
      if (!isOwner) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
      const cl = checklistStatus(task);
      if (!cl.complete) return Response.json({ ok: false, reason: 'checklist_incomplete', checked: cl.checked, total: cl.total });
      update = {
        status: 'review',
        review_status: 'pending_review',
        last_submitted_at: new Date().toISOString(),
        last_change_source: 'board_claim',
        submission_cycles: openCycle(task, me, myName),
      };
    } else if (action === 'complete') {
      const isReviewer = REVIEWER_ROLES.includes(user.role);
      if (!isOwner && !isReviewer) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
      if (user.role === 'staff') return Response.json({ ok: false, reason: 'staff_cannot_complete' });
      const cl = checklistStatus(task);
      if (!cl.complete) return Response.json({ ok: false, reason: 'checklist_incomplete', checked: cl.checked, total: cl.total });
      if (task.reviewer_email && !isReviewer) return Response.json({ ok: false, reason: 'needs_review' });
      if (isReviewer) {
        const today = bkkToday();
        update = {
          status: 'completed',
          completed_date: today,
          review_status: 'approved',
          reviewer_email: me,
          reviewer_name: myName,
          reviewed_date: today,
          review_note: task.status === 'review' ? '' : 'ปิดงานโดยหัวหน้างาน (ไม่ผ่าน review)',
          last_change_source: 'board_complete',
        };
        const cycles = Array.isArray(task.submission_cycles) ? [...task.submission_cycles] : [];
        const idx = cycles.findIndex(c => c && c.decision === 'pending');
        if (idx >= 0) {
          const nowIso = new Date().toISOString();
          const start = new Date(cycles[idx].submitted_at).getTime();
          const hours = isNaN(start) ? null : Math.round(((Date.now() - start) / 3600000) * 10) / 10;
          cycles[idx] = { ...cycles[idx], decision: 'approved', decided_at: nowIso, decided_by: me, decided_by_name: myName, ...(hours !== null ? { turnaround_hours: hours } : {}) };
          update.submission_cycles = cycles;
        }
        if (task.first_time_right === undefined || task.first_time_right === null) {
          update.first_time_right = !cycles.some(c => c && c.decision === 'rejected');
        }
      } else {
        update = { status: 'completed', last_change_source: 'board_complete' };
      }
    } else {
      return Response.json({ ok: false, reason: 'invalid_action' }, { status: 400 });
    }

    await Task.update(task_id, update);

    base44.asServiceRole.entities.AuditLog.create({
      action: `board_${action}`,
      entity_type: 'Task',
      entity_id: task_id,
      entity_name: task.title || '',
      user_email: me,
      user_name: myName,
      details: `กระดานงาน: ${action} งาน "${task.title || ''}"${note ? ` — ${note}` : ''}`,
      changes: { before: { status: task.status, assigned_to: task.assigned_to || '' }, after: update },
    }).catch(() => {});

    return Response.json({ ok: true, warning });
  } catch (error) {
    console.error('taskClaim error:', error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}