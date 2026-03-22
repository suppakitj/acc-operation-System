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

  console.log(`Manual retry: found ${toRetry.length} failed messages to retry`);

  // Reset retry count first so the regular retry job can also pick them up
  for (const msg of toRetry) {
    await base44.asServiceRole.entities.LineMessage.update(msg.id, {
      drive_retry_count: 0,
    });
  }

  let successCount = 0;
  let failCount = 0;

  // Process in batches of 3
  const BATCH_SIZE = 3;
  for (let i = 0; i < toRetry.length; i += BATCH_SIZE) {
    const batch = toRetry.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(async (msg) => {
      const isImage = msg.message_type === 'image';
      const fileName = isImage
        ? `line_image_${msg.id}.jpg`
        : msg.content?.replace(/[\[\]]/g, '').replace('ไฟล์: ', '') || `line_file_${msg.id}`;
      const contentType = isImage ? 'image/jpeg' : 'application/octet-stream';
      const chatName = msg.display_name || 'Unknown';

      const result = await base44.asServiceRole.functions.invoke('saveLineFileToDrive', {
        file_url: msg.file_url,
        file_name: fileName,
        content_type: contentType,
        chat_display_name: chatName,
        message_type: msg.message_type,
      });

      const resData = result?.data || result;
      if (resData?.success || resData?.drive_file_id) {
        await base44.asServiceRole.entities.LineMessage.update(msg.id, {
          drive_saved: true,
          drive_retry_count: 1,
        });
        console.log(`✓ Manual retry success for message ${msg.id}`);
        return 'success';
      } else {
        await base44.asServiceRole.entities.LineMessage.update(msg.id, {
          drive_retry_count: 1,
        });
        console.log(`✗ Manual retry failed for message ${msg.id}: ${JSON.stringify(resData)}`);
        return 'fail';
      }
    }));

    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value === 'success') successCount++;
      else failCount++;
    });

    if (i + BATCH_SIZE < toRetry.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return Response.json({
    retried: toRetry.length,
    success: successCount,
    failed: failCount,
  });
});