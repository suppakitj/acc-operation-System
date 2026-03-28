import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Retry saving LINE files to Google Drive for messages that failed previously.
 * Finds LineMessage records with file_url set but drive_saved=false,
 * and retries calling saveLineFileToDrive for each.
 * Max 10 retries per message before giving up.
 */

const MAX_RETRIES = 10;

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

    // Find messages with files that haven't been saved to Drive
    let failedMessages;
    try {
      failedMessages = await base44.asServiceRole.entities.LineMessage.filter(
        { drive_saved: false, direction: 'incoming' },
        '-created_date',
        100
      );
    } catch (filterErr) {
      console.error('Failed to fetch messages:', filterErr.message);
      return Response.json({ error: 'Failed to fetch messages', details: filterErr.message }, { status: 500 });
    }

    // Handle SDK returning string
    if (typeof failedMessages === 'string') {
      try { failedMessages = JSON.parse(failedMessages); } catch { failedMessages = []; }
    }
    if (!Array.isArray(failedMessages)) failedMessages = [];

    // Filter to only those with file_url and file types (image/file)
    const toRetry = failedMessages.filter(m =>
      m.file_url &&
      (m.message_type === 'image' || m.message_type === 'file') &&
      (m.drive_retry_count || 0) < MAX_RETRIES
    );

    console.log(`Found ${toRetry.length} messages to retry Drive save (of ${failedMessages.length} unsaved)`);

    if (toRetry.length === 0) {
      return Response.json({ total_checked: failedMessages.length, retried: 0, success: 0, failed: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    // Process in batches of 5 to avoid overloading Drive API
    const BATCH_SIZE = 5;
    for (let i = 0; i < toRetry.length; i += BATCH_SIZE) {
      const batch = toRetry.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(batch.map(async (msg) => {
        const retryNum = (msg.drive_retry_count || 0) + 1;
        const isImage = msg.message_type === 'image';
        const fileName = isImage
          ? `line_image_${msg.id}.jpg`
          : msg.content?.replace(/[\[\]]/g, '').replace('ไฟล์: ', '') || `line_file_${msg.id}`;
        const contentType = isImage ? 'image/jpeg' : 'application/octet-stream';
        const chatName = msg.display_name || 'Unknown';

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
          // Catch errors from invoke() itself (network, timeout, etc.)
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

      // Small delay between batches to ease API pressure
      if (i + BATCH_SIZE < toRetry.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Drive retry complete: ${successCount} success, ${failCount} failed out of ${toRetry.length}`);

    return Response.json({
      total_checked: failedMessages.length,
      retried: toRetry.length,
      success: successCount,
      failed: failCount,
    });
  } catch (error) {
    console.error('retryDriveSave top-level error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});