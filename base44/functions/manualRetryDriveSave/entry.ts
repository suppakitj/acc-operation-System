import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Manual retry for failed Drive saves.
 * Resets retry count for messages that exceeded MAX_RETRIES,
 * then immediately processes them in batches.
 * Admin only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find all incoming image/file messages that failed (drive_saved=false, retry >= 10)
    // Paginate to find all
    let allUnsaved = [];
    let skip = 0;
    const PAGE_SIZE = 100;
    while (true) {
      const page = await base44.asServiceRole.entities.LineMessage.filter(
        { drive_saved: false, direction: 'incoming' },
        '-created_date',
        PAGE_SIZE,
        skip
      );
      if (!Array.isArray(page) || page.length === 0) break;
      allUnsaved = allUnsaved.concat(page);
      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
      if (allUnsaved.length >= 1000) break;
    }

    const toRetry = allUnsaved.filter(m =>
      m.file_url &&
      (m.message_type === 'image' || m.message_type === 'file') &&
      (m.drive_retry_count || 0) >= 10
    );

    if (toRetry.length === 0) {
      return Response.json({ message: 'ไม่มีไฟล์ที่ล้มเหลวให้ retry', retried: 0, success: 0, failed: 0 });
    }

    console.log(`Manual retry: found ${toRetry.length} failed messages — resetting retry counts`);

    // Reset retry counts in batches of 20 using sequential updates with delay
    for (let i = 0; i < toRetry.length; i += 20) {
      const batch = toRetry.slice(i, i + 20);
      await Promise.all(batch.map(msg =>
        base44.asServiceRole.entities.LineMessage.update(msg.id, { drive_retry_count: 0 })
      ));
      if (i + 20 < toRetry.length) await new Promise(r => setTimeout(r, 1000));
    }

    // Trigger retryDriveSave to process them now
    let retryResult = null;
    try {
      const res = await base44.asServiceRole.functions.invoke('retryDriveSave', {});
      retryResult = res?.data || res;
    } catch (e) {
      console.warn('retryDriveSave invoke failed:', e.message);
    }

    return Response.json({
      retried: toRetry.length,
      success: retryResult?.success || 0,
      failed: retryResult?.failed || 0,
      message: `รีเซ็ต ${toRetry.length} ไฟล์แล้ว${retryResult ? ` — ประมวลผลแล้ว ${retryResult.success || 0} สำเร็จ` : ' — ระบบจะ retry อัตโนมัติ'}`,
    });
  } catch (error) {
    console.error('manualRetryDriveSave error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});