import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get Google Drive access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Get KB folder ID from AppConfig
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'gdrive_kb_folder_id' });
    const folderId = configs.length > 0 ? configs[0].value : null;

    // Build multipart upload
    const metadata = {
      name: file.name,
      ...(folderId ? { parents: [folderId] } : {}),
    };

    const boundary = '---kb_upload_boundary';
    const fileBytes = new Uint8Array(await file.arrayBuffer());

    const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
    const endPart = `\r\n--${boundary}--`;

    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(metaPart);
    const filePartBytes = encoder.encode(filePart);
    const endBytes = encoder.encode(endPart);

    const body = new Uint8Array(metaBytes.length + filePartBytes.length + fileBytes.length + endBytes.length);
    let offset = 0;
    body.set(metaBytes, offset); offset += metaBytes.length;
    body.set(filePartBytes, offset); offset += filePartBytes.length;
    body.set(fileBytes, offset); offset += fileBytes.length;
    body.set(endBytes, offset);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return Response.json({ error: `Google Drive upload failed: ${err}` }, { status: 500 });
    }

    const driveFile = await uploadRes.json();

    return Response.json({
      success: true,
      name: driveFile.name,
      drive_file_id: driveFile.id,
      drive_url: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
      size: parseInt(driveFile.size || '0'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});