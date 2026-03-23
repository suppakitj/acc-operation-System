import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Manual retry for failed Drive saves.
 * Resets retry count and re-attempts saving files that exceeded MAX_RETRIES.
 * Admin only.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Find all incoming image/file messages that failed (drive_saved=false, retry >= 10)
  const allFailed = await base44.asServiceRole.entities.LineMessage.filter(
    { drive_saved: false, direction: 'incoming' },
    '-created_date',
    100
  );

  const toRetry = allFailed.filter(m =>
    m.file_url &&
    (m.message_type === 'image' || m.message_type === 'file') &&
    (m.drive_retry_count || 0) >= 10
  );

  if (toRetry.length === 0) {
    return Response.json({ message: 'ไม่มีไฟล์ที่ล้มเหลวให้ retry', retried: 0, success: 0, failed: 0 });
  }

  console.log(`Manual retry: found ${toRetry.length} failed messages — resetting retry counts`);

  // Reset retry count so the scheduled automation picks them up
  for (const msg of toRetry) {
    await base44.asServiceRole.entities.LineMessage.update(msg.id, {
      drive_retry_count: 0,
    });
  }

  // Don't actually process files here to avoid CPU timeout.
  // The scheduled retryDriveSave automation will handle them in the next cycle.
  return Response.json({
    retried: toRetry.length,
    success: 0,
    failed: 0,
    message: `รีเซ็ต ${toRetry.length} ไฟล์แล้ว — ระบบจะ retry อัตโนมัติภายใน 2 ชม.`,
  });
});