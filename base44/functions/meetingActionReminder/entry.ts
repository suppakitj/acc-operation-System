import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendToLineGroup(accessToken, groupId, message) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: message }] }),
  });
  if (!res.ok) console.error(`LINE push failed: ${res.status} ${await res.text()}`);
  return res.ok;
}

function formatThaiDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Bangkok timezone
    const now = new Date();
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokNow = new Date(now.getTime() + bangkokOffset);
    const todayStr = bangkokNow.toISOString().split('T')[0];

    // Skip weekends
    const dayOfWeek = bangkokNow.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return Response.json({ status: 'skipped', reason: 'weekend' });
    }

    // Fetch open meeting notes
    const openNotes = await base44.asServiceRole.entities.MeetingNote.filter(
      { status: 'open' }, '-meeting_date', 500
    );

    if (openNotes.length === 0) {
      return Response.json({ status: 'no_open_notes' });
    }

    // Find action items that are due today or overdue
    const alerts = []; // { note, item, type: 'today' | 'overdue', daysOverdue }

    for (const note of openNotes) {
      const items = note.action_items || [];
      for (const item of items) {
        if (item.done) continue;
        if (!item.due_date) continue;

        if (item.due_date === todayStr) {
          alerts.push({ note, item, type: 'today', daysOverdue: 0 });
        } else if (item.due_date < todayStr) {
          const days = Math.floor((new Date(todayStr) - new Date(item.due_date)) / (1000 * 60 * 60 * 24));
          alerts.push({ note, item, type: 'overdue', daysOverdue: days });
        }
      }
    }

    if (alerts.length === 0) {
      return Response.json({ status: 'no_alerts', today: todayStr });
    }

    // Group by staff
    const byStaff = {};
    for (const alert of alerts) {
      const email = alert.note.staff_email;
      if (!byStaff[email]) byStaff[email] = { name: alert.note.staff_name || email, items: [] };
      byStaff[email].items.push(alert);
    }

    // Send Notifications
    const overdueAlerts = alerts.filter(a => a.type === 'overdue');
    const todayAlerts = alerts.filter(a => a.type === 'today');

    for (const [email, data] of Object.entries(byStaff)) {
      const staffOverdue = data.items.filter(a => a.type === 'overdue');
      const staffToday = data.items.filter(a => a.type === 'today');

      let message = '';
      if (staffOverdue.length > 0) {
        message += `🔴 เลยกำหนด ${staffOverdue.length} รายการ:\n`;
        staffOverdue.forEach(a => {
          message += `- ${a.item.text} (เลย ${a.daysOverdue} วัน) จาก "${a.note.title}"\n`;
        });
      }
      if (staffToday.length > 0) {
        message += `⚠️ กำหนดวันนี้ ${staffToday.length} รายการ:\n`;
        staffToday.forEach(a => {
          message += `- ${a.item.text} จาก "${a.note.title}"\n`;
        });
      }

      // Notification ให้ staff
      await base44.asServiceRole.entities.Notification.create({
        title: `📝 Action Item ${overdueAlerts.length > 0 ? 'เลยกำหนด' : 'กำหนดวันนี้'} (${data.items.length})`,
        message: message.trim(),
        type: 'due_3days',
        target_user: email,
      }).catch(e => console.warn('Notification failed:', e.message));

      // Notification ให้ manager ด้วย
      const managerEmails = [...new Set(data.items.map(a => a.note.manager_email))];
      for (const mgrEmail of managerEmails) {
        if (mgrEmail === email) continue;
        await base44.asServiceRole.entities.Notification.create({
          title: `📝 Action Item ของ ${data.name} ${staffOverdue.length > 0 ? 'เลยกำหนด' : 'กำหนดวันนี้'}`,
          message: message.trim(),
          type: 'due_3days',
          target_user: mgrEmail,
        }).catch(e => console.warn('Notification failed:', e.message));
      }
    }

    // Send LINE กลุ่มบัญชี
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const getVal = (key) => configs.find(c => c.key === key)?.value || '';
    const accessToken = getVal('line_access_token');
    const groupId = getVal('line_group_dept_accounting') || getVal('line_group_id');

    if (accessToken && groupId) {
      const lines = [];
      lines.push(`📝 แจ้งเตือน Action Item จาก Meeting Notes`);
      lines.push(`📆 ${formatThaiDate(todayStr)}`);
      lines.push('━━━━━━━━━━━━━━━━');

      if (overdueAlerts.length > 0) {
        lines.push('');
        lines.push(`🔴 เลยกำหนด (${overdueAlerts.length} รายการ)`);
        lines.push('─────────────');
        overdueAlerts.forEach(a => {
          lines.push(`• ${a.item.text}`);
          lines.push(`   👤 ${a.note.staff_name || ''} — เลย ${a.daysOverdue} วัน`);
          lines.push(`   📄 จาก: ${a.note.title}`);
        });
      }

      if (todayAlerts.length > 0) {
        lines.push('');
        lines.push(`⚠️ กำหนดวันนี้ (${todayAlerts.length} รายการ)`);
        lines.push('─────────────');
        todayAlerts.forEach(a => {
          lines.push(`• ${a.item.text}`);
          lines.push(`   👤 ${a.note.staff_name || ''}`);
          lines.push(`   📄 จาก: ${a.note.title}`);
        });
      }

      lines.push('');
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`รวม ${alerts.length} รายการ | 🔴 ${overdueAlerts.length} เลยกำหนด | ⚠️ ${todayAlerts.length} วันนี้`);

      const message = lines.join('\n');
      if (message.length <= 5000) {
        await sendToLineGroup(accessToken, groupId, message);
      } else {
        const parts = message.split('\n\n');
        let chunk = '';
        for (const part of parts) {
          if ((chunk + '\n\n' + part).length > 4800 && chunk) {
            await sendToLineGroup(accessToken, groupId, chunk);
            chunk = part;
          } else {
            chunk = chunk ? chunk + '\n\n' + part : part;
          }
        }
        if (chunk) await sendToLineGroup(accessToken, groupId, chunk);
      }
    }

    console.log(`Meeting action reminder: ${alerts.length} alerts (${overdueAlerts.length} overdue, ${todayAlerts.length} today)`);

    return Response.json({
      status: 'sent',
      today: todayStr,
      total_alerts: alerts.length,
      overdue: overdueAlerts.length,
      due_today: todayAlerts.length,
      staff_notified: Object.keys(byStaff).length,
    });
  } catch (error) {
    console.error('meetingActionReminder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});