import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Retry saving LINE files to Google Drive for messages that failed previously.
 * Processes in small batches with delay to avoid rate limits and timeouts.
 * Max 10 retries per message before giving up.
 */

const MAX_RETRIES = 10;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;
const MAX_PROCESS = 30; // Process max 30 per run to avoid timeout

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — automation runs with service token, manual calls need admin
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // Called from automation (no user context) — allow
    }

    // Fetch unsaved messages in pages to find all pending
    let failedMessages = [];
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
      failedMessages = failedMessages.concat(page);
      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
      // Safety: don't fetch more than 1000
      if (failedMessages.length >= 1000) break;
    }

    // Filter to only those with file_url and file types (image/file) and under max retries
    const toRetry = failedMessages.filter(m =>
      m.file_url &&
      (m.message_type === 'image' || m.message_type === 'file') &&
      (m.drive_retry_count || 0) < MAX_RETRIES
    );

    console.log(`Found ${toRetry.length} messages to retry Drive save (of ${failedMessages.length} unsaved)`);

    if (toRetry.length === 0) {
      return Response.json({ total_checked: failedMessages.length, retried: 0, success: 0, failed: 0 });
    }

    // Only process up to MAX_PROCESS per run to avoid timeout
    const batch = toRetry.slice(0, MAX_PROCESS);
    let successCount = 0;
    let failCount = 0;

    // Process in small batches
    for (let i = 0; i < batch.length; i += BATCH_SIZE) {
      const chunk = batch.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(chunk.map(async (msg) => {
        const retryNum = (msg.drive_retry_count || 0) + 1;
        const isImage = msg.message_type === 'image';
        const fileName = isImage
          ? `line_image_${msg.id}.jpg`
          : msg.content?.replace(/[\[\]]/g, '').replace('ไฟล์: ', '') || `line_file_${msg.id}`;
        const contentType = isImage ? 'image/jpeg' : 'application/octet-stream';
        const chatName = msg.display_name || msg.customer_name || 'Unknown';

        try {
          const result = await base44.asServiceRole.functions.invoke('saveLineFileToDrive', {
            file_url: msg.file_url,
            file_name: fileName,
            content_type: contentType,
            chat_display_name: chatName,
            message_type: msg.message_type,
            sender_name: msg.sender_name || msg.display_name || 'Unknown',
          });

          const resData = result?.data || result;
          if (resData?.success || resData?.drive_file_id) {
            await base44.asServiceRole.entities.LineMessage.update(msg.id, {
              drive_saved: true,
              drive_retry_count: retryNum,
            });
            console.log(`✓ Retry #${retryNum} success for message ${msg.id}`);
            return 'success';
          } else {
            await base44.asServiceRole.entities.LineMessage.update(msg.id, {
              drive_retry_count: retryNum,
            });
            console.log(`✗ Retry #${retryNum} failed for message ${msg.id}: ${JSON.stringify(resData?.error || 'unknown')}`);
            return 'fail';
          }
        } catch (invokeErr) {
          console.error(`✗ Retry #${retryNum} threw error for message ${msg.id}: ${invokeErr.message}`);
          try {
            await base44.asServiceRole.entities.LineMessage.update(msg.id, {
              drive_retry_count: retryNum,
            });
          } catch { /* ignore update error */ }
          return 'fail';
        }
      }));

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value === 'success') successCount++;
        else failCount++;
      });

      // Delay between batches to ease API pressure
      if (i + BATCH_SIZE < batch.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`Drive retry complete: ${successCount} success, ${failCount} failed out of ${batch.length} (${toRetry.length} total pending)`);

    return Response.json({
      total_checked: failedMessages.length,
      total_pending: toRetry.length,
      retried: batch.length,
      success: successCount,
      failed: failCount,
      remaining: toRetry.length - batch.length,
    });
  } catch (error) {
    console.error('retryDriveSave top-level error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});