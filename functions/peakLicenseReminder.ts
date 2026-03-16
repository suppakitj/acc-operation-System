import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load notification settings from AppConfig
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'peak_notification_settings' });
    const settingsCfg = configs.find(c => c.key === 'peak_notification_settings');
    let settings = { reminder_days: [30, 15, 7], channels: ['email'] };
    if (settingsCfg?.value) {
      try { settings = { ...settings, ...JSON.parse(settingsCfg.value) }; } catch {}
    }

    // Load all active peak licenses
    const licenses = await base44.asServiceRole.entities.PeakLicense.filter({});
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const results = [];

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

      // Send notifications
      const message = `Peak License ของ ${license.customer_name} (${license.package_type?.toUpperCase()}) จะหมดอายุในอีก ${matchedDay} วัน (${license.expiry_date})`;

      for (const channel of settings.channels) {
        if (channel === 'email') {
          // Send email notification
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
        }
        // LINE notification would go here when LINE integration is set up
      }

      // Update notification history
      const newHistory = [...history, {
        date: todayStr,
        channel: settings.channels.join(', '),
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

      results.push({ customer: license.customer_name, days_left: matchedDay, notified: true });
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

    return Response.json({ success: true, processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});