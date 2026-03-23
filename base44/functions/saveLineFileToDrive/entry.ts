import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Save a LINE file to Google Drive with folder structure:
 * LINE Files / {customerName} / {YYYY} / {MM} / {DD} / filename
 */

async function findOrCreateFolder(accessToken, name, parentId) {
  // Search for existing folder by name under parent
  const q = parentId
    ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) metadata.parents = [parentId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create folder "${name}": ${errText}`);
  }

  const folder = await createRes.json();
  return folder.id;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { file_url, file_name, content_type, chat_display_name, message_type } = await req.json();

  if (!file_url || !chat_display_name) {
    return Response.json({ error: 'file_url and chat_display_name are required' }, { status: 400 });
  }

  // Get Google Drive access token
  let accessToken;
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
    accessToken = conn.accessToken;
  } catch (e) {
    console.error('Google Drive not connected:', e.message);
    return Response.json({ error: 'Google Drive not connected' }, { status: 400 });
  }

  // Build folder path: LINE Files / {chatName} / {YYYY} / {MM} / {DD}
  const now = new Date();
  // Use Bangkok timezone
  const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const year = String(bangkokTime.getFullYear());
  const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
  const day = String(bangkokTime.getDate()).padStart(2, '0');

  // Sanitize folder name (remove special chars)
  const safeName = chat_display_name.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'Unknown';

  console.log(`Saving file to Drive: LINE Files / ${safeName} / ${year} / ${month} / ${day} / ${file_name}`);

  // Create nested folder structure
  const rootFolderId = await findOrCreateFolder(accessToken, 'LINE Files', null);
  const customerFolderId = await findOrCreateFolder(accessToken, safeName, rootFolderId);
  const yearFolderId = await findOrCreateFolder(accessToken, year, customerFolderId);
  const monthFolderId = await findOrCreateFolder(accessToken, month, yearFolderId);
  const dayFolderId = await findOrCreateFolder(accessToken, day, monthFolderId);

  // Download the file
  const fileRes = await fetch(file_url);
  if (!fileRes.ok) {
    return Response.json({ error: 'Failed to download file from storage' }, { status: 500 });
  }
  const fileBuffer = await fileRes.arrayBuffer();

  // Determine file name and content type
  const finalFileName = file_name || `line_${message_type || 'file'}_${Date.now()}`;
  const finalContentType = content_type || 'application/octet-stream';

  // Upload to Google Drive using multipart upload
  const metadata = {
    name: finalFileName,
    parents: [dayFolderId],
  };

  const boundary = 'line_drive_boundary_' + Date.now();
  const metadataStr = JSON.stringify(metadata);
  const encoder = new TextEncoder();

  const metaPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n`
  );
  const filePart = encoder.encode(`--${boundary}\r\nContent-Type: ${finalContentType}\r\n\r\n`);
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
    console.error('Google Drive upload failed:', errText);
    return Response.json({ error: 'Drive upload failed', details: errText }, { status: 500 });
  }

  const driveFile = await driveRes.json();
  console.log(`File saved to Drive: ${driveFile.name} (${driveFile.id})`);

  return Response.json({
    success: true,
    drive_file_id: driveFile.id,
    drive_file_name: driveFile.name,
    drive_link: driveFile.webViewLink,
    folder_path: `LINE Files/${safeName}/${year}/${month}/${day}`,
  });
});