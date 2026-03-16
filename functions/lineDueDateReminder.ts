import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PRIORITY_EMOJI = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
const PRIORITY_LABEL = { urgent: 'เร่งด่วน', high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' };
const STATUS_LABEL = { pending: 'รอดำเนินการ', in_progress: 'กำลังทำ', review: 'รอตรวจสอบ' };

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function getDaysDiff(dueDateStr, todayStr) {
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  return Math.floor((due - today) / (1000 * 60 * 60 * 24));
}

async function sendToLineGroup(accessToken, groupId, message) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: groupId,
      messages: [{ type: 'text', text: message }],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error(`LINE push failed: ${res.status} ${errBody}`);
  }
  return res.ok;
}

function buildSection(emoji, title, tasks) {
  if (tasks.length === 0) return null;
  const lines = [`${emoji} ${title} (${tasks.length} งาน)`, '─────────────'];
  tasks.forEach((t, i) => {
    const pEmoji = PRIORITY_EMOJI[t.priority] || '📋';
    const pLabel = PRIORITY_LABEL[t.priority] || '-';
    const statusLabel = STATUS_LABEL[t.status] || t.status || '-';
    lines.push(`${i + 1}. ${pEmoji} ${t.title}`);
    if (t.customer_name) lines.push(`   🏢 ${t.customer_name}`);
    lines.push(`   👤 ${t.assigned_name || '-'}`);
    lines.push(`   📅 กำหนด: ${formatDate(t.due_date)}`);
    lines.push(`   📌 ${statusLabel} | ${pLabel}`);
    if (i < tasks.length - 1) lines.push('');
  });
  return lines.join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get LINE config
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const getVal = (key) => configs.find(c => c.key === key)?.value || '';
    const accessToken = getVal('line_access_token');
    const lineGroupId = getVal('line_group_id');
    const lineUserId = getVal('line_user_id');

    // Determine target: group first, fallback to admin user
    const target = lineGroupId || lineUserId;

    if (!accessToken) {
      console.warn('LINE access token not configured');
      return Response.json({ status: 'skipped', reason: 'no access token' });
    }

    if (!target) {
      console.warn('No LINE Group ID or User ID configured');
      return Response.json({ status: 'skipped', reason: 'no target' });
    }

    // Get today's date in Bangkok timezone
    const now = new Date();
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokNow = new Date(now.getTime() + bangkokOffset);
    const todayStr = bangkokNow.toISOString().split('T')[0];

    // Fetch all active tasks with due_date
    const allTasks = await base44.asServiceRole.entities.Task.filter({});
    const activeTasks = allTasks.filter(t =>
      t.due_date &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    );

    // Categorize
    const overdueTasks = [];
    const due3Days = [];
    const due7Days = [];

    for (const task of activeTasks) {
      const diff = getDaysDiff(task.due_date, todayStr);
      if (diff < 0) {
        overdueTasks.push({ ...task, _daysOver: Math.abs(diff) });
      } else if (diff <= 3) {
        due3Days.push({ ...task, _daysLeft: diff });
      } else if (diff <= 7) {
        due7Days.push({ ...task, _daysLeft: diff });
      }
    }

    // Sort: overdue by most overdue first, others by soonest first
    overdueTasks.sort((a, b) => b._daysOver - a._daysOver);
    due3Days.sort((a, b) => a._daysLeft - b._daysLeft);
    due7Days.sort((a, b) => a._daysLeft - b._daysLeft);

    const totalAlerts = overdueTasks.length + due3Days.length + due7Days.length;

    if (totalAlerts === 0) {
      console.log('No due date alerts today');
      return Response.json({ status: 'ok', message: 'No alerts' });
    }

    // Build message
    const sections = [];

    sections.push(`📢 แจ้งเตือน Due Date ประจำวัน`);
    sections.push(`📆 ${formatDate(todayStr)}`);
    sections.push(`━━━━━━━━━━━━━━━━`);

    const overdueSection = buildSection('🚨 OVERDUE — เกินกำหนดแล้ว!', `เกินกำหนด`, overdueTasks);
    if (overdueSection) sections.push(overdueSection);

    const due3Section = buildSection('⚠️ อีก 3 วันจะครบกำหนด', `ครบกำหนดภายใน 3 วัน`, due3Days);
    if (due3Section) sections.push(due3Section);

    const due7Section = buildSection('📋 อีก 7 วันจะครบกำหนด', `ครบกำหนดภายใน 7 วัน`, due7Days);
    if (due7Section) sections.push(due7Section);

    sections.push(`━━━━━━━━━━━━━━━━`);
    sections.push(`รวม ${totalAlerts} งาน | 🚨 ${overdueTasks.length} เกินกำหนด | ⚠️ ${due3Days.length} ใน 3 วัน | 📋 ${due7Days.length} ใน 7 วัน`);

    const fullMessage = sections.join('\n\n');

    // LINE message limit is 5000 chars — split if needed
    if (fullMessage.length <= 5000) {
      await sendToLineGroup(accessToken, target, fullMessage);
    } else {
      // Send header + each section separately
      const header = `📢 แจ้งเตือน Due Date ประจำวัน\n📆 ${formatDate(todayStr)}\n━━━━━━━━━━━━━━━━\nรวม ${totalAlerts} งาน | 🚨 ${overdueTasks.length} เกินกำหนด | ⚠️ ${due3Days.length} ใน 3 วัน | 📋 ${due7Days.length} ใน 7 วัน`;
      await sendToLineGroup(accessToken, target, header);

      if (overdueSection) await sendToLineGroup(accessToken, target, overdueSection);
      if (due3Section) await sendToLineGroup(accessToken, target, due3Section);
      if (due7Section) await sendToLineGroup(accessToken, target, due7Section);
    }

    // Also save notification records
    const notifPromises = [];
    for (const t of overdueTasks) {
      notifPromises.push(base44.asServiceRole.entities.Notification.create({
        title: `🚨 งานเกินกำหนด: ${t.title}`,
        message: `งาน "${t.title}" เกินกำหนด ${t._daysOver} วัน (กำหนด ${formatDate(t.due_date)})`,
        type: 'overdue',
        target_user: t.assigned_to || '',
        related_entity_type: 'Task',
        related_entity_id: t.id,
        customer_name: t.customer_name || '',
        sent_via_line: true,
      }));
    }
    for (const t of due3Days) {
      notifPromises.push(base44.asServiceRole.entities.Notification.create({
        title: `⚠️ งานใกล้ครบกำหนด: ${t.title}`,
        message: `งาน "${t.title}" จะครบกำหนดในอีก ${t._daysLeft} วัน (${formatDate(t.due_date)})`,
        type: 'due_3days',
        target_user: t.assigned_to || '',
        related_entity_type: 'Task',
        related_entity_id: t.id,
        customer_name: t.customer_name || '',
        sent_via_line: true,
      }));
    }
    for (const t of due7Days) {
      notifPromises.push(base44.asServiceRole.entities.Notification.create({
        title: `📋 งานใกล้ครบกำหนด: ${t.title}`,
        message: `งาน "${t.title}" จะครบกำหนดในอีก ${t._daysLeft} วัน (${formatDate(t.due_date)})`,
        type: 'due_7days',
        target_user: t.assigned_to || '',
        related_entity_type: 'Task',
        related_entity_id: t.id,
        customer_name: t.customer_name || '',
        sent_via_line: true,
      }));
    }
    await Promise.all(notifPromises);

    console.log(`Due date reminder sent: ${totalAlerts} alerts (overdue: ${overdueTasks.length}, 3d: ${due3Days.length}, 7d: ${due7Days.length})`);
    return Response.json({
      status: 'sent',
      target: lineGroupId ? 'group' : 'user',
      overdue: overdueTasks.length,
      due_3days: due3Days.length,
      due_7days: due7Days.length,
      total: totalAlerts,
    });

  } catch (error) {
    console.error('Due date reminder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});