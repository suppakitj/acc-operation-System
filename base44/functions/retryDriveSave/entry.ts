import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Retry saving LINE files to Google Drive for messages that failed previously.
 * Directly uploads to Drive (no nested function call) to avoid service-role auth issues.
 * Max 10 retries per message before giving up.
 */

const MAX_RETRIES = 10;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;
const MAX_PROCESS = 30;

async function findOrCreateFolder(accessToken, name, parentId) {
  const q = parentId
    ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) return data.files[0].id;
  }

  const metadata = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) metadata.parents = [parentId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create folder "${name}": ${errText}`);
  }
  return (await createRes.json()).id;
}

async function uploadFileToDrive(accessToken, msg) {
  const isImage = msg.message_type === 'image';
  const fileName = isImage
    ? `line_image_${msg.id}.jpg`
    : msg.content?.replace(/[\[\]]/g, '').replace('ไฟล์: ', '') || `line_file_${msg.id}`;
  const contentType = isImage ? 'image/jpeg' : 'application/octet-stream';
  const chatName = (msg.display_name || msg.customer_name || 'Unknown').replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Unknown';
  const senderName = (msg.sender_name || msg.display_name || 'Unknown').replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Unknown';

  // Build folder: LINE Files / chat / YYYY / MM / DD / sender
  const now = new Date();
  const bkk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const year = String(bkk.getFullYear());
  const month = String(bkk.getMonth() + 1).padStart(2, '0');
  const day = String(bkk.getDate()).padStart(2, '0');

  const rootId = await findOrCreateFolder(accessToken, 'LINE Files', null);
  const chatId = await findOrCreateFolder(accessToken, chatName, rootId);
  const yearId = await findOrCreateFolder(accessToken, year, chatId);
  const monthId = await findOrCreateFolder(accessToken, month, yearId);
  const dayId = await findOrCreateFolder(accessToken, day, monthId);
  const senderId = await findOrCreateFolder(accessToken, senderName, dayId);

  // Download file
  const fileRes = await fetch(msg.file_url);
  if (!fileRes.ok) throw new Error('Failed to download file from storage');
  const fileBuffer = await fileRes.arrayBuffer();

  // Upload
  const metadata = { name: fileName, parents: [senderId] };
  const boundary = 'retry_boundary_' + Date.now();
  const metadataStr = JSON.stringify(metadata);
  const encoder = new TextEncoder();
  const metaPart = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n`);
  const filePart = encoder.encode(`--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`);
  const endPart = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(metaPart.length + filePart.length + fileBuffer.byteLength + endPart.length);
  body.set(metaPart, 0);
  body.set(filePart, metaPart.length);
  body.set(new Uint8Array(fileBuffer), metaPart.length + filePart.length);
  body.set(endPart, metaPart.length + filePart.length + fileBuffer.byteLength);

  const driveRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!driveRes.ok) {
    const errText = await driveRes.text();
    throw new Error(`Drive upload failed (${driveRes.status}): ${errText}`);
  }

  return await driveRes.json();
}

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

    // Get Google Drive access token
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
      accessToken = conn.accessToken;
    } catch (e) {
      console.error('Google Drive not connected:', e.message);
      return Response.json({ error: 'Google Drive not connected', details: e.message }, { status: 400 });
    }

    // Fetch unsaved messages
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
      if (failedMessages.length >= 1000) break;
    }

    // Fix legacy: mark non-file messages (text, sticker, etc.) as drive_saved=true
    // since they don't need Drive saving
    const nonFileMessages = failedMessages.filter(m =>
      !m.file_url || (m.message_type !== 'image' && m.message_type !== 'file')
    );
    if (nonFileMessages.length > 0) {
      console.log(`Fixing ${nonFileMessages.length} non-file messages (marking drive_saved=true)`);
      const fixBatch = nonFileMessages.slice(0, 50); // fix up to 50 per run
      for (const msg of fixBatch) {
        try {
          await base44.asServiceRole.entities.LineMessage.update(msg.id, { drive_saved: true });
        } catch { /* ignore */ }
      }
    }

    // Filter to only image/file with file_url and under max retries
    const toRetry = failedMessages.filter(m =>
      m.file_url &&
      (m.message_type === 'image' || m.message_type === 'file') &&
      (m.drive_retry_count || 0) < MAX_RETRIES
    );

    console.log(`Found ${toRetry.length} messages to retry Drive save (of ${failedMessages.length} unsaved)`);

    if (toRetry.length === 0) {
      return Response.json({ total_checked: failedMessages.length, retried: 0, success: 0, failed: 0 });
    }

    const batch = toRetry.slice(0, MAX_PROCESS);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < batch.length; i += BATCH_SIZE) {
      const chunk = batch.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(chunk.map(async (msg) => {
        const retryNum = (msg.drive_retry_count || 0) + 1;
        try {
          const driveFile = await uploadFileToDrive(accessToken, msg);
          await base44.asServiceRole.entities.LineMessage.update(msg.id, {
            drive_saved: true,
            drive_retry_count: retryNum,
          });
          console.log(`✓ Retry #${retryNum} success for message ${msg.id} → ${driveFile.name}`);
          return 'success';
        } catch (err) {
          console.error(`✗ Retry #${retryNum} failed for message ${msg.id}: ${err.message}`);
          try {
            await base44.asServiceRole.entities.LineMessage.update(msg.id, {
              drive_retry_count: retryNum,
            });
          } catch { /* ignore */ }
          return 'fail';
        }
      }));

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value === 'success') successCount++;
        else failCount++;
      });

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