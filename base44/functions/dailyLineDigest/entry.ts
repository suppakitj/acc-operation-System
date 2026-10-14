import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

const URG_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function bkkDateStr(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function thaiDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

async function pushLine(accessToken, to, text) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  });
  if (!res.ok) console.error(`LINE push failed for ${to}: ${res.status} ${await res.text()}`);
  return res.ok;
}

async function fetchAll(entity, query) {
  const out = [];
  let cursor;
  do {
    const page = await entity.filter(query, { sort: '-created_date', limit: 500, ...(cursor ? { cursor } : {}) });
    out.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole.entities;

    const today = bkkDateStr(new Date());
    const yesterday = bkkDateStr(new Date(Date.now() - 24 * 3600 * 1000));
    const startIso = new Date(`${yesterday}T00:00:00+07:00`).toISOString();
    const endIso = new Date(`${yesterday}T23:59:59.999+07:00`).toISOString();
    const range = { $gte: startIso, $lte: endIso };

    // A. mentions
    const mentions = await fetchAll(sr.LineMessage, { direction: 'incoming', mentions_us: true, created_date: range });
    // B. actionable
    const actionable = await fetchAll(sr.LineMessage, { is_actionable: true, created_date: range });
    const newInQueue = actionable.filter(m => m.triage_status === 'new').length;
    // C, D, E
    const overdue = await sr.Task.count({ due_date: { $lt: today }, status: { $nin: ['completed', 'cancelled'] } });
    const unassigned = await sr.Task.count({ status: 'pending', $or: [{ assigned_to: { $exists: false } }, { assigned_to: '' }, { assigned_to: null }] });
    const pendingReq = await sr.LineRequest.count({ status: 'pending' });

    const top = [...actionable]
      .sort((a, b) => {
        const r = (URG_RANK[a.auto_priority] ?? 4) - (URG_RANK[b.auto_priority] ?? 4);
        if (r !== 0) return r;
        const da = a.extracted_due_date || '9999-12-31';
        const db = b.extracted_due_date || '9999-12-31';
        return da.localeCompare(db);
      })
      .slice(0, 10)
      .map(m => ({
        customer_name: m.customer_name || m.display_name || '',
        sender_name: m.sender_name || '',
        summary: m.summary_th || String(m.content || '').slice(0, 80),
        due_date: m.extracted_due_date || '',
        urgency: m.auto_priority || '',
        line_message_id: m.id,
      }));

    const nothing = mentions.length === 0 && actionable.length === 0 && overdue === 0 && unassigned === 0 && pendingReq === 0;
    let text;
    if (nothing) {
      text = `📊 สรุป LINE ประจำวันที่ ${thaiDate(yesterday)}\nเมื่อวานไม่มีเรื่องค้าง ✅`;
    } else {
      const lines = [
        `📊 สรุป LINE ประจำวันที่ ${thaiDate(yesterday)}`,
        '━━━━━━━━━━━━━━',
        `💬 พูดถึงเรา: ${mentions.length} ข้อความ`,
        `📋 เป็นคำสั่งงาน: ${actionable.length} รายการ (ค้างในคิว ${newInQueue})`,
        `🔴 งานเลยกำหนด: ${overdue}`,
        `👤 งานยังไม่มีคนรับ: ${unassigned}`,
        `📨 คำขอค้างใน LINE Requests: ${pendingReq}`,
      ];
      if (top.length > 0) {
        lines.push('', '━━ เรื่องที่ควรดูก่อน ━━');
        top.forEach((t, i) => {
          lines.push(`${i + 1}. [${t.customer_name || '-'}] ${t.summary} — กำหนด ${t.due_date ? thaiDate(t.due_date) : 'ไม่ระบุ'}`);
        });
      }
      text = lines.join('\n');
    }

    // Recipients (never customer groups)
    const configs = await sr.AppConfig.filter({});
    const getVal = (k) => configs.find(c => c.key === k)?.value || '';
    const accessToken = getVal('line_access_token');
    const forbidden = new Set([getVal('line_group_id'), getVal('line_last_seen_group_id')].filter(Boolean));
    const custGroups = await sr.LineGroup.filter({});
    custGroups.forEach(g => g.group_id && forbidden.add(g.group_id));

    const targets = [];
    const primary = getVal('digest_recipient_line_user_id') || getVal('line_user_id');
    if (primary) targets.push(primary);
    const internal = getVal('line_internal_group_id');
    if (internal) targets.push(internal);

    const sentTo = [];
    if (accessToken) {
      for (const t of [...new Set(targets)]) {
        if (forbidden.has(t)) { console.warn(`Skip forbidden target ${t}`); continue; }
        try { if (await pushLine(accessToken, t, text)) sentTo.push(t); }
        catch (e) { console.error('push error:', e.message); }
      }
    } else {
      console.warn('No LINE access token configured');
    }

    const record = {
      digest_date: yesterday,
      generated_at: new Date().toISOString(),
      mention_count: mentions.length,
      actionable_count: actionable.length,
      new_in_queue: newInQueue,
      overdue_task_count: overdue,
      unassigned_count: unassigned,
      pending_request_count: pendingReq,
      summary_markdown: text,
      top_items: top,
      sent_to: sentTo,
    };
    const existing = await sr.DailyDigest.filter({ digest_date: yesterday });
    if (existing[0]) await sr.DailyDigest.update(existing[0].id, record);
    else await sr.DailyDigest.create(record);

    try {
      const admins = await sr.User.filter({ role: 'admin' });
      for (const a of admins) {
        await sr.Notification.create({
          title: `สรุป LINE ประจำวันที่ ${thaiDate(yesterday)}`,
          message: text,
          type: 'system',
          target_user: a.email,
          related_entity_type: 'DailyDigest',
          sent_via_line: sentTo.length > 0,
        });
      }
    } catch (e) { console.warn('Notification create failed:', e.message); }

    return Response.json({ success: true, digest_date: yesterday, sent_to: sentTo, ...record });
  } catch (error) {
    console.error('dailyLineDigest error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 200 });
  }
});