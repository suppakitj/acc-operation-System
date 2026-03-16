import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SERVICE_LABELS = {
  accounting: 'ทำบัญชี',
  payroll: 'เงินเดือน',
  tax_consulting: 'ที่ปรึกษาภาษี',
  audit: 'ตรวจสอบบัญชี',
  peak_licensing: 'Peak Account',
};

const PRIORITY_LABELS = {
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'สูง ⚠️',
  urgent: 'เร่งด่วน 🔴',
};

function getBangkokDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
}

function dateDiffDays(dueStr, today) {
  const due = new Date(dueStr + 'T00:00:00');
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - todayMidnight) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildEmailHTML(customerName, tasks, senderName) {
  const taskRows = tasks.map(t => {
    let urgencyColor, urgencyLabel;
    if (t.daysLeft < 0) {
      urgencyColor = '#dc2626';
      urgencyLabel = `เกินกำหนด ${Math.abs(t.daysLeft)} วัน`;
    } else if (t.daysLeft <= 3) {
      urgencyColor = '#ea580c';
      urgencyLabel = `อีก ${t.daysLeft} วัน`;
    } else {
      urgencyColor = '#d97706';
      urgencyLabel = `อีก ${t.daysLeft} วัน`;
    }

    return `
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${t.title}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${SERVICE_LABELS[t.service_type] || t.service_type || '-'}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${formatDate(t.due_date)}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;"><span style="color: ${urgencyColor}; font-weight: 600;">${urgencyLabel}</span></td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${PRIORITY_LABELS[t.priority] || t.priority || '-'}</td>
      </tr>
    `;
  }).join('');

  const overdueCount = tasks.filter(t => t.daysLeft < 0).length;
  const dueSoonCount = tasks.filter(t => t.daysLeft >= 0 && t.daysLeft <= 3).length;
  const dueWeekCount = tasks.filter(t => t.daysLeft > 3 && t.daysLeft <= 7).length;

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">${senderName}</h1>
        <p style="color: #93c5fd; margin: 8px 0 0; font-size: 13px;">📋 แจ้งเตือนกำหนดส่งงาน — Due Date Reminder</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 14px; line-height: 1.7;">
          เรียน <strong>${customerName}</strong>,
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.7;">
          ทางบริษัทขอแจ้งเตือนงานที่ใกล้ถึงกำหนดส่งหรือเลยกำหนดแล้ว ดังรายละเอียดด้านล่างนี้ กรุณาตรวจสอบและดำเนินการให้แล้วเสร็จตามกำหนดเวลาด้วยค่ะ
        </p>

        ${overdueCount > 0 ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 15px; margin: 15px 0;">
          <p style="margin: 0; color: #991b1b; font-size: 13px; font-weight: 600;">🔴 เกินกำหนดแล้ว ${overdueCount} งาน</p>
        </div>` : ''}

        ${dueSoonCount > 0 ? `<div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 15px; margin: 15px 0;">
          <p style="margin: 0; color: #9a3412; font-size: 13px; font-weight: 600;">🟠 ใกล้กำหนด (≤3 วัน) ${dueSoonCount} งาน</p>
        </div>` : ''}

        ${dueWeekCount > 0 ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 15px; margin: 15px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">🟡 กำหนดภายใน 7 วัน ${dueWeekCount} งาน</p>
        </div>` : ''}

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px 15px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0;">ชื่องาน</th>
              <th style="padding: 12px 15px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0;">บริการ</th>
              <th style="padding: 12px 15px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0;">กำหนดส่ง</th>
              <th style="padding: 12px 15px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0;">สถานะ</th>
              <th style="padding: 12px 15px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0;">ความสำคัญ</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>

        <p style="color: #475569; font-size: 13px; line-height: 1.7;">
          หากมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม สามารถติดต่อเจ้าหน้าที่ที่ดูแลบัญชีของท่านได้โดยตรงค่ะ
        </p>
        <p style="color: #475569; font-size: 13px; line-height: 1.7;">
          ขอบคุณค่ะ<br>
          <strong>${senderName}</strong>
        </p>
      </div>
      <div style="background: #f8fafc; padding: 15px 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          อีเมลนี้ส่งโดยอัตโนมัติจากระบบ ${senderName} — กรุณาอย่าตอบกลับ
        </p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch config
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const getVal = (key) => configs.find(c => c.key === key)?.value || '';
    const senderName = getVal('o365_sender_name') || getVal('smtp_sender_name') || 'ACC Consulting';
    const emailSubject = getVal('o365_email_subject') || getVal('smtp_email_subject') || '[ACC Consulting] แจ้งเตือนกำหนดส่งงาน';

    const today = getBangkokDate();

    // Fetch all active tasks that are NOT completed/cancelled and have a due_date
    const allTasks = await base44.asServiceRole.entities.Task.filter({});
    const activeTasks = allTasks.filter(t =>
      t.due_date &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    );

    // Filter tasks: overdue OR due within 7 days
    const alertTasks = activeTasks.map(t => ({
      ...t,
      daysLeft: dateDiffDays(t.due_date, today),
    })).filter(t => t.daysLeft <= 7);

    if (alertTasks.length === 0) {
      console.log('No tasks approaching due date. Skipping email.');
      return Response.json({ status: 'skipped', message: 'ไม่มีงานใกล้กำหนด — ข้ามการส่งอีเมล' });
    }

    // Group tasks by customer_id
    const tasksByCustomer = {};
    for (const t of alertTasks) {
      const key = t.customer_id || 'no_customer';
      if (!tasksByCustomer[key]) tasksByCustomer[key] = [];
      tasksByCustomer[key].push(t);
    }

    // Fetch all customers
    const allCustomers = await base44.asServiceRole.entities.Customer.filter({});
    const customerMap = {};
    for (const c of allCustomers) {
      customerMap[c.id] = c;
    }

    let sentCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const [customerId, tasks] of Object.entries(tasksByCustomer)) {
      const customer = customerMap[customerId];

      // Determine email recipient: customer contact_email or billing_email
      const recipientEmail = customer?.contact_email || customer?.billing_profile?.billing_email;
      const customerName = customer?.company_name || tasks[0]?.customer_name || 'ลูกค้า';

      if (!recipientEmail) {
        // No customer email — skip but also notify assigned staff
        skippedCount++;
        console.log(`Skipped customer "${customerName}" — no contact email`);

        // Send to assigned staff instead
        const staffEmails = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
        for (const staffEmail of staffEmails) {
          try {
            const staffTasks = tasks.filter(t => t.assigned_to === staffEmail);
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: senderName,
              to: staffEmail,
              subject: `${emailSubject} — ${customerName}`,
              body: buildEmailHTML(customerName, staffTasks.sort((a, b) => a.daysLeft - b.daysLeft), senderName),
            });
            sentCount++;
          } catch (e) {
            errors.push(`Staff ${staffEmail}: ${e.message}`);
          }
        }
        continue;
      }

      // Sort tasks: overdue first, then by daysLeft ascending
      tasks.sort((a, b) => a.daysLeft - b.daysLeft);

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: senderName,
          to: recipientEmail,
          subject: `${emailSubject} — ${customerName}`,
          body: buildEmailHTML(customerName, tasks, senderName),
        });
        sentCount++;
        console.log(`Sent due date reminder to ${recipientEmail} for "${customerName}" (${tasks.length} tasks)`);

        // Also create notification record
        await base44.asServiceRole.entities.Notification.create({
          title: `📧 ส่งอีเมลแจ้งเตือน Due Date — ${customerName}`,
          message: `ส่งอีเมลแจ้งเตือน ${tasks.length} งานใกล้กำหนดไปยัง ${recipientEmail}`,
          type: 'system',
          customer_name: customerName,
          is_read: false,
        });

      } catch (e) {
        errors.push(`${recipientEmail} (${customerName}): ${e.message}`);
        console.error(`Failed to send to ${recipientEmail}:`, e.message);
      }
    }

    const summary = {
      status: 'completed',
      date: today.toISOString(),
      total_alert_tasks: alertTasks.length,
      emails_sent: sentCount,
      skipped_no_email: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Email Due Date Reminder completed:', JSON.stringify(summary));
    return Response.json(summary);

  } catch (error) {
    console.error('emailDueDateReminder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});