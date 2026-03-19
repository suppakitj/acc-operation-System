import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const PKG_LABELS = { trial: 'TRIAL', basic: 'BASIC', pro: 'PRO', pro_plus: 'PRO Plus' };

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
    console.error(`LINE push failed for ${groupId}: ${res.status} ${errBody}`);
  }
  return res.ok;
}

function buildPeakLineMessage(reminderItems) {
  if (reminderItems.length === 0) return null;
  const lines = [
    '📢 แจ้งเตือน Peak License ใกล้หมดอายุ',
    `📆 ${formatDate(new Date().toISOString().split('T')[0])}`,
    '━━━━━━━━━━━━━━━━',
  ];

  reminderItems.forEach((item, i) => {
    lines.push(`${i + 1}. 🏢 ${item.customer_name}`);
    lines.push(`   📦 แพ็กเกจ: ${PKG_LABELS[item.package_type] || item.package_type}`);
    lines.push(`   📅 หมดอายุ: ${formatDate(item.expiry_date)}`);
    lines.push(`   ⏳ เหลืออีก ${item.daysLeft} วัน`);
    if (i < reminderItems.length - 1) lines.push('');
  });

  lines.push('━━━━━━━━━━━━━━━━');
  lines.push(`รวม ${reminderItems.length} รายการ — กรุณาดำเนินการต่ออายุ`);

  return lines.join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load notification settings from AppConfig
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const getVal = (key) => configs.find(c => c.key === key)?.value || '';

    const settingsCfg = configs.find(c => c.key === 'peak_notification_settings');
    let settings = { reminder_days: [30, 15, 7], channels: ['email'] };
    if (settingsCfg?.value) {
      try { settings = { ...settings, ...JSON.parse(settingsCfg.value) }; } catch {}
    }

    // LINE config
    const lineAccessToken = getVal('line_access_token');
    const accountingGroupId = getVal('line_group_dept_accounting');

    // Load all active peak licenses
    const licenses = await base44.asServiceRole.entities.PeakLicense.filter({});
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const results = [];
    const lineReminderItems = [];

    for (const license of licenses) {
      if (!license.expiry_date) continue;
      if (license.license_status === 'cancelled' || license.license_status === 'expired') continue;

      const expiryDate = new Date(license.expiry_date);
      const diffMs = expiryDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Check if we need to send reminder
      const matchedDay = settings.reminder_days.find(d => daysLeft === d);
      if (matchedDay === undefined) continue;

      // Check if already notified today for this day threshold
      const history = license.notification_history || [];
      const alreadySent = history.some(h => h.date === todayStr && h.days_before === matchedDay);
      if (alreadySent) continue;

      const message = `Peak License ของ ${license.customer_name} (${license.package_type?.toUpperCase()}) จะหมดอายุในอีก ${matchedDay} วัน (${license.expiry_date})`;

      const channelsSent = [];

      // Send email notification
      if (settings.channels.includes('email')) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `[Peak License] แจ้งเตือน: ${license.customer_name} หมดอายุใน ${matchedDay} วัน`,
          body: `<div style="font-family:sans-serif;padding:20px">
            <h2>แจ้งเตือน Peak License ใกล้หมดอายุ</h2>
            <p><strong>ลูกค้า:</strong> ${license.customer_name}</p>
            <p><strong>แพ็กเกจ:</strong> ${license.package_type?.toUpperCase()}</p>
            <p><strong>วันหมดอายุ:</strong> ${license.expiry_date}</p>
            <p><strong>เหลืออีก:</strong> ${matchedDay} วัน</p>
            <p>กรุณาดำเนินการต่ออายุ License</p>
          </div>`,
        });
        channelsSent.push('email');
      }

      // Collect items for LINE batch message
      if (settings.channels.includes('line')) {
        lineReminderItems.push({
          customer_name: license.customer_name,
          package_type: license.package_type,
          expiry_date: license.expiry_date,
          daysLeft: matchedDay,
        });
        channelsSent.push('line');
      }

      // Update notification history
      const newHistory = [...history, {
        date: todayStr,
        channel: channelsSent.join(', '),
        days_before: matchedDay,
        message: message,
      }];

      // Auto-update status if expiring soon
      const statusUpdate = {};
      if (daysLeft <= 30 && license.license_status === 'active') {
        statusUpdate.license_status = 'expiring_soon';
      }

      await base44.asServiceRole.entities.PeakLicense.update(license.id, {
        notification_history: newHistory,
        ...statusUpdate,
      });

      results.push({ customer: license.customer_name, days_left: matchedDay, notified: true, channels: channelsSent });
    }

    // Send LINE message to accounting department group (batch all items in one message)
    let lineSent = false;
    if (lineReminderItems.length > 0 && lineAccessToken && accountingGroupId) {
      const lineMsg = buildPeakLineMessage(lineReminderItems);
      if (lineMsg) {
        const ok = await sendToLineGroup(lineAccessToken, accountingGroupId, lineMsg);
        lineSent = ok;
        console.log(`Peak LINE reminder sent to accounting group: ${ok ? 'success' : 'failed'}`);
      }
    } else if (lineReminderItems.length > 0) {
      if (!lineAccessToken) console.warn('LINE access token not configured — skipped LINE notification');
      if (!accountingGroupId) console.warn('Accounting LINE group ID not configured (line_group_dept_accounting) — skipped LINE notification');
    }

    // Also check for expired licenses and update status
    for (const license of licenses) {
      if (!license.expiry_date) continue;
      if (license.license_status === 'cancelled' || license.license_status === 'expired' || license.license_status === 'renewed') continue;
      const expiryDate = new Date(license.expiry_date);
      if (today > expiryDate) {
        await base44.asServiceRole.entities.PeakLicense.update(license.id, { license_status: 'expired' });
        results.push({ customer: license.customer_name, status_updated: 'expired' });
      }
    }

    return Response.json({ success: true, processed: results.length, line_sent: lineSent, line_items: lineReminderItems.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});