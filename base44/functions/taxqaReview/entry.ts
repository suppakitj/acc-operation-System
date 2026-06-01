import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  const writeLog = (logData) => {
    base44.asServiceRole.entities.AuditLog.create({
      ...logData,
      user_email: user.email,
      user_name: user.full_name || user.email,
    }).catch(() => {});
  };

  // ─── BATCH APPROVE (fast-track: clean → approved) ───
  if (action === 'batch_approve') {
    const { filing_ids } = body;
    if (!Array.isArray(filing_ids) || filing_ids.length === 0) {
      return Response.json({ error: 'filing_ids required' }, { status: 400 });
    }
    let approved = 0;
    for (const fid of filing_ids) {
      const filings = await base44.entities.TaxQA_Filing.filter({ id: fid });
      const f = filings[0];
      if (!f || f.status !== 'clean') continue;

      await base44.entities.TaxQA_Filing.update(fid, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_by_name: user.full_name || user.email,
        approved_at: new Date().toISOString(),
      });

      writeLog({
        action: 'approve',
        entity_type: 'TaxQA_Filing',
        entity_id: fid,
        entity_name: `${f.form_type} ${f.tax_period} — ${f.customer_name}`,
        details: `อนุมัติ fast-track: ${f.form_type} งวด ${f.tax_period} ลูกค้า "${f.customer_name}"`,
        changes: { status: { from: 'clean', to: 'approved' } },
      });
      approved++;
    }
    return Response.json({ success: true, approved });
  }

  // ─── OPEN REVIEW (flagged → under_review) ───
  if (action === 'open_review') {
    const { filing_id } = body;
    const filings = await base44.entities.TaxQA_Filing.filter({ id: filing_id });
    const f = filings[0];
    if (!f) return Response.json({ error: 'Filing not found' }, { status: 404 });
    if (f.status !== 'flagged') return Response.json({ error: `Cannot open review: status is ${f.status}` }, { status: 400 });

    await base44.entities.TaxQA_Filing.update(filing_id, {
      status: 'under_review',
      reviewed_by: user.email,
      reviewed_by_name: user.full_name || user.email,
    });

    writeLog({
      action: 'open_review',
      entity_type: 'TaxQA_Filing',
      entity_id: filing_id,
      entity_name: `${f.form_type} ${f.tax_period} — ${f.customer_name}`,
      details: `เปิดตรวจ exception: ${f.form_type} งวด ${f.tax_period} ลูกค้า "${f.customer_name}"`,
      changes: { status: { from: 'flagged', to: 'under_review' } },
    });
    return Response.json({ success: true });
  }

  // ─── OVERRIDE FLAG ───
  if (action === 'override_flag') {
    const { flag_id, resolution_note } = body;
    const flags = await base44.entities.TaxQA_ExceptionFlag.filter({ id: flag_id });
    const flag = flags[0];
    if (!flag) return Response.json({ error: 'Flag not found' }, { status: 404 });

    await base44.entities.TaxQA_ExceptionFlag.update(flag_id, {
      status: 'overridden',
      resolved_by: user.email,
      resolved_by_name: user.full_name || user.email,
      resolution_note: resolution_note || '',
      resolved_at: new Date().toISOString(),
    });

    writeLog({
      action: 'override',
      entity_type: 'TaxQA_Filing',
      entity_id: flag.filing_id,
      entity_name: `Flag ${flag.rule_code}`,
      details: `Override flag "${flag.rule_code}": ${flag.message} — เหตุผล: ${resolution_note || '-'}`,
      changes: { flag_status: { from: flag.status, to: 'overridden' } },
    });
    return Response.json({ success: true });
  }

  // ─── APPROVE EXCEPTION FILING (under_review → approved) ───
  if (action === 'approve_exception') {
    const { filing_id } = body;
    const filings = await base44.entities.TaxQA_Filing.filter({ id: filing_id });
    const f = filings[0];
    if (!f) return Response.json({ error: 'Filing not found' }, { status: 404 });
    if (f.status !== 'under_review') return Response.json({ error: `Cannot approve: status is ${f.status}` }, { status: 400 });

    // Check no open error flags remain
    const flags = await base44.entities.TaxQA_ExceptionFlag.filter({ filing_id });
    const openErrors = flags.filter(fl => fl.severity === 'error' && fl.status === 'open');
    if (openErrors.length > 0) {
      return Response.json({ error: `ยังมี error flag ที่ยัง open ${openErrors.length} รายการ — ต้อง override ก่อน`, open_error_count: openErrors.length }, { status: 400 });
    }

    await base44.entities.TaxQA_Filing.update(filing_id, {
      status: 'approved',
      reviewed_by: user.email,
      reviewed_by_name: user.full_name || user.email,
      approved_at: new Date().toISOString(),
    });

    writeLog({
      action: 'approve',
      entity_type: 'TaxQA_Filing',
      entity_id: filing_id,
      entity_name: `${f.form_type} ${f.tax_period} — ${f.customer_name}`,
      details: `อนุมัติ exception review: ${f.form_type} งวด ${f.tax_period} ลูกค้า "${f.customer_name}"`,
      changes: { status: { from: 'under_review', to: 'approved' } },
    });
    return Response.json({ success: true });
  }

  // ─── REJECT EXCEPTION FILING (under_review → rejected) ───
  if (action === 'reject_exception') {
    const { filing_id, rejection_note } = body;
    const filings = await base44.entities.TaxQA_Filing.filter({ id: filing_id });
    const f = filings[0];
    if (!f) return Response.json({ error: 'Filing not found' }, { status: 404 });
    if (f.status !== 'under_review') return Response.json({ error: `Cannot reject: status is ${f.status}` }, { status: 400 });

    await base44.entities.TaxQA_Filing.update(filing_id, {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_note: rejection_note || '',
    });

    writeLog({
      action: 'reject',
      entity_type: 'TaxQA_Filing',
      entity_id: filing_id,
      entity_name: `${f.form_type} ${f.tax_period} — ${f.customer_name}`,
      details: `ตีกลับ: ${f.form_type} งวด ${f.tax_period} ลูกค้า "${f.customer_name}" — เหตุผล: ${rejection_note || '-'}`,
      changes: { status: { from: 'under_review', to: 'rejected' } },
    });
    return Response.json({ success: true });
  }

  // ─── RESUBMIT (rejected → validating) ───
  if (action === 'resubmit') {
    const { filing_id } = body;
    const filings = await base44.entities.TaxQA_Filing.filter({ id: filing_id });
    const f = filings[0];
    if (!f) return Response.json({ error: 'Filing not found' }, { status: 404 });
    if (f.status !== 'rejected') return Response.json({ error: `Cannot resubmit: status is ${f.status}` }, { status: 400 });

    // Check only prepared_by can resubmit
    if (f.prepared_by && f.prepared_by !== user.email) {
      return Response.json({ error: 'เฉพาะผู้จัดทำเท่านั้นที่ส่งตรวจใหม่ได้' }, { status: 403 });
    }

    await base44.entities.TaxQA_Filing.update(filing_id, {
      status: 'validating',
      submitted_at: new Date().toISOString(),
      rejection_note: '',
    });

    writeLog({
      action: 'resubmit',
      entity_type: 'TaxQA_Filing',
      entity_id: filing_id,
      entity_name: `${f.form_type} ${f.tax_period} — ${f.customer_name}`,
      details: `ส่งตรวจใหม่: ${f.form_type} งวด ${f.tax_period} ลูกค้า "${f.customer_name}"`,
      changes: { status: { from: 'rejected', to: 'validating' } },
    });
    return Response.json({ success: true });
  }

  // ─── MARK FILED (approved → filed) ───
  if (action === 'mark_filed') {
    const { filing_id, filed_ref } = body;
    const filings = await base44.entities.TaxQA_Filing.filter({ id: filing_id });
    const f = filings[0];
    if (!f) return Response.json({ error: 'Filing not found' }, { status: 404 });
    if (f.status !== 'approved') return Response.json({ error: `Cannot mark filed: status is ${f.status}` }, { status: 400 });

    await base44.entities.TaxQA_Filing.update(filing_id, {
      status: 'filed',
      filed_at: new Date().toISOString(),
      filed_ref: filed_ref || f.filed_ref || '',
    });

    writeLog({
      action: 'mark_filed',
      entity_type: 'TaxQA_Filing',
      entity_id: filing_id,
      entity_name: `${f.form_type} ${f.tax_period} — ${f.customer_name}`,
      details: `ยืนยันยื่นแล้ว: ${f.form_type} งวด ${f.tax_period} ลูกค้า "${f.customer_name}"`,
      changes: { status: { from: 'approved', to: 'filed' } },
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});