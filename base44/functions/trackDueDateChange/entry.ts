import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Entity automation handler: tracks when a Task's due_date is changed.
 * Records who changed it, from what to what, and increments the change counter.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    if (!event || !data || !old_data) {
      return Response.json({ status: 'skipped', reason: 'missing data' });
    }

    // Only process if due_date actually changed
    const oldDue = old_data.due_date || '';
    const newDue = data.due_date || '';

    if (oldDue === newDue || !oldDue) {
      // Skip if due_date didn't change, or if it was empty before (first time setting)
      return Response.json({ status: 'skipped', reason: 'due_date not changed' });
    }

    const taskId = event.entity_id;

    // Dedup: check if the last history entry already records this exact change
    const existingHistory = Array.isArray(data.due_date_change_history) ? data.due_date_change_history : [];
    if (existingHistory.length > 0) {
      const last = existingHistory[existingHistory.length - 1];
      if (last.old_due_date === oldDue && last.new_due_date === newDue) {
        // Check if the last entry was recorded within the last 10 seconds — likely a duplicate trigger
        const lastTime = new Date(last.changed_at).getTime();
        const now = Date.now();
        if (now - lastTime < 10000) {
          console.log(`Skipping duplicate trigger for task ${taskId}: ${oldDue} → ${newDue}`);
          return Response.json({ status: 'skipped', reason: 'duplicate trigger' });
        }
      }
    }

    // Determine who made the change
    // Entity automations receive 'updated_by' from the platform (the user who triggered the update)
    // Fall back to created_by only if updated_by is not available
    const changedBy = data.updated_by || 'system';

    // Look up the user to get their name and role
    let changedByName = changedBy;
    let changedByRole = '';
    if (changedBy && changedBy !== 'system') {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: changedBy }, '-created_date', 1);
        if (users.length > 0) {
          changedByName = users[0].full_name || changedBy;
          changedByRole = users[0].role || '';
        }
      } catch (e) {
        console.warn('Could not look up user:', e.message);
      }
    }

    // Get current history
    const currentHistory = Array.isArray(data.due_date_change_history) ? data.due_date_change_history : [];
    const oldHistory = Array.isArray(old_data.due_date_change_history) ? old_data.due_date_change_history : [];
    const currentCount = data.due_date_change_count || 0;

    // If the frontend already appended a history entry (e.g. Task Calendar drag or Task form),
    // the new data will have more entries than old data.
    // In that case, skip writing another entry to avoid duplicates.
    if (currentHistory.length > oldHistory.length) {
      console.log(`History already recorded by frontend for task ${taskId}: ${oldDue} → ${newDue} (count: ${currentCount})`);
      return Response.json({ status: 'skipped', reason: 'already recorded by frontend' });
    }

    // Build new history entry (for changes made from Task form or other places)
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const entry = {
      changed_at: bangkokTime.toISOString(),
      changed_by: changedBy,
      changed_by_name: changedByName,
      changed_by_role: changedByRole,
      old_due_date: oldDue,
      new_due_date: newDue,
    };

    // Update the task with new history
    await base44.asServiceRole.entities.Task.update(taskId, {
      due_date_change_count: currentCount + 1,
      due_date_change_history: [...currentHistory, entry],
    });

    // Check if it's a self-change by the assigned person (potential gaming)
    const isAssignedUser = changedBy === data.assigned_to;
    const isSupervisorOrManager = changedByRole === 'super_supervisor' || changedByRole === 'manager';

    if (isAssignedUser || isSupervisorOrManager) {
      console.log(`⚠️ Due date changed by ${changedByRole || 'assigned user'} ${changedByName}: ${oldDue} → ${newDue} (Task: ${data.title}, change #${currentCount + 1})`);
    } else {
      console.log(`Due date changed by ${changedByName}: ${oldDue} → ${newDue} (Task: ${data.title}, change #${currentCount + 1})`);
    }

    return Response.json({
      status: 'tracked',
      task_id: taskId,
      change_count: currentCount + 1,
      changed_by: changedByName,
      old_due_date: oldDue,
      new_due_date: newDue,
    });
  } catch (error) {
    console.error('trackDueDateChange error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});