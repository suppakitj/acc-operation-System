import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

const MANAGER_ROLES = ['admin', 'management', 'manager'];

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
    } else if (action === 'submit_review') {
      if (!isOwner) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
      update = { status: 'review', last_change_source: 'board_claim' };
    } else if (action === 'complete') {
      if (!isOwner) return Response.json({ ok: false, reason: 'forbidden' }, { status: 403 });
      if (task.reviewer_email) return Response.json({ ok: false, reason: 'needs_review' });
      update = { status: 'completed', last_change_source: 'board_complete' };
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