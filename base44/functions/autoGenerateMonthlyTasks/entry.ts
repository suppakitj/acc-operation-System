import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both webhook (no auth) and user-triggered (with auth)
    let triggeredBy = 'auto-cron';
    try {
      const user = await base44.auth.me();
      if (user) triggeredBy = user.full_name || user.email;
    } catch {}

    // Bangkok timezone
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // Check if already generated this month
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'last_auto_generate' });
    const lastGenerated = configs.length > 0 ? configs[0].value : '';

    if (lastGenerated === monthKey) {
      return Response.json({
        success: true,
        skipped: true,
        message: `เดือน ${monthKey} สร้างงานไปแล้ว — ข้าม`,
      });
    }

    // === Replicate generateMonthlyTasks logic (dry_run: false) ===
    // Fetch active templates
    const allTemplates = await base44.asServiceRole.entities.TaskTemplate.filter(
      { status: 'active' }, '-created_date', 500
    );

    // Filter templates applicable for this month
    const templates = allTemplates.filter(tmpl => {
      if (tmpl.recurring_type === 'quarterly') {
        if (tmpl.applicable_months?.length > 0) return tmpl.applicable_months.includes(currentMonth);
        return [1, 4, 7, 10].includes(currentMonth);
      }
      if (tmpl.recurring_type === 'yearly') {
        if (tmpl.applicable_months?.length > 0) return tmpl.applicable_months.includes(currentMonth);
        return currentMonth === 1;
      }
      if (tmpl.applicable_months?.length > 0) return tmpl.applicable_months.includes(currentMonth);
      return true;
    });

    // Fetch active customers
    const customers = await base44.asServiceRole.entities.Customer.filter(
      { status: 'active' }, '-created_date', 1000
    );

    // Fetch existing tasks for dedup
    const monthStr = String(currentMonth).padStart(2, '0');
    const existingTasks = await base44.asServiceRole.entities.Task.filter(
      { is_recurring: true }, '-created_date', 5000
    );
    const existingKeys = new Set();
    existingTasks.forEach(t => {
      if (t.template_id && t.customer_id && t.due_date) {
        existingKeys.add(`${t.template_id}_${t.customer_id}_${t.due_date.substring(0, 7)}`);
      }
    });

    // Generate tasks
    const created = [];
    let skippedDuplicate = 0;

    for (const tmpl of templates) {
      const matchType = tmpl.match_type || 'service';
      let matchingCustomers;
      if (matchType === 'obligation' && tmpl.obligation_type) {
        matchingCustomers = customers.filter(c => c.obligations?.includes(tmpl.obligation_type));
      } else {
        matchingCustomers = customers.filter(c => c.services?.includes(tmpl.service_type));
      }

      for (const customer of matchingCustomers) {
        const dueDay = Math.min(tmpl.due_date_rule || 15, 28);
        const dueDate = `${currentYear}-${monthStr}-${String(dueDay).padStart(2, '0')}`;
        const dueDateMonth = `${currentYear}-${monthStr}`;
        const dedupKey = `${tmpl.id}_${customer.id}_${dueDateMonth}`;

        if (existingKeys.has(dedupKey)) {
          skippedDuplicate++;
          continue;
        }

        let assignedTo = '';
        let assignedName = '';
        if (tmpl.default_owner_type === 'specific_user' && tmpl.default_owner) {
          assignedTo = tmpl.default_owner;
          assignedName = tmpl.default_owner_name || '';
        } else {
          assignedTo = customer.primary_officer || '';
          assignedName = customer.primary_officer_name || '';
        }

        let startDate;
        if (tmpl.estimated_days) {
          const due = new Date(dueDate);
          due.setDate(due.getDate() - tmpl.estimated_days);
          startDate = due.toISOString().split('T')[0];
        }

        const taskData = {
          title: tmpl.name,
          description: tmpl.description || '',
          customer_id: customer.id,
          customer_name: customer.company_name,
          service_type: tmpl.service_type || tmpl.obligation_type || '',
          department: tmpl.department || '',
          assigned_to: assignedTo,
          assigned_name: assignedName,
          priority: tmpl.default_priority || 'medium',
          status: tmpl.default_status || 'pending',
          due_date: dueDate,
          start_date: startDate || undefined,
          is_recurring: true,
          recurring_type: tmpl.recurring_type,
          template_id: tmpl.id,
          checklist: tmpl.default_checklist || [],
        };

        const newTask = await base44.asServiceRole.entities.Task.create(taskData);
        created.push(newTask);
        existingKeys.add(dedupKey);
      }
    }

    // Save last_auto_generate
    if (configs.length > 0) {
      await base44.asServiceRole.entities.AppConfig.update(configs[0].id, { value: monthKey });
    } else {
      await base44.asServiceRole.entities.AppConfig.create({
        key: 'last_auto_generate',
        value: monthKey,
        description: 'เดือนล่าสุดที่ auto generate tasks',
      });
    }

    // Send LINE notification to accounting group
    const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const lineConfigs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'line_group_dept_accounting' });
    const lineGroupId = lineConfigs.length > 0 ? lineConfigs[0].value : '';

    if (lineGroupId && created.length > 0) {
      const lineTokenConfigs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'line_access_token' });
      const accessToken = lineTokenConfigs.length > 0 ? lineTokenConfigs[0].value : '';

      if (accessToken) {
        const message = `📅 สร้างงานอัตโนมัติ\n━━━━━━━━━━━━━━━━\n📆 ${monthNames[currentMonth - 1]} ${currentYear + 543}\n✅ สร้าง ${created.length} งาน\n⏭️ ข้าม ${skippedDuplicate} งาน (สร้างแล้ว)\n📋 จาก ${templates.length} templates\n👤 โดย: ${triggeredBy}\n━━━━━━━━━━━━━━━━\nACC Consulting Co., Ltd.`;

        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            to: lineGroupId,
            messages: [{ type: 'text', text: message }],
          }),
        }).catch(e => console.warn('LINE notify failed:', e.message));
      }
    }

    return Response.json({
      success: true,
      month: monthKey,
      total_created: created.length,
      skipped_duplicate: skippedDuplicate,
      templates_used: templates.length,
      triggered_by: triggeredBy,
    });
  } catch (error) {
    console.error('autoGenerateMonthlyTasks error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});