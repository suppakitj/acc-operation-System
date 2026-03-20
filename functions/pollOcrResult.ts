import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const MANUS_BASE = 'https://api.manus.ai/v1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ocr_job_id } = await req.json();
  if (!ocr_job_id) return Response.json({ error: 'ocr_job_id is required' }, { status: 400 });

  const job = await base44.entities.OcrJob.get(ocr_job_id);
  if (!job || !job.manus_task_id) {
    return Response.json({ error: 'Job not found or no task_id' }, { status: 400 });
  }

  // Get Manus API Key
  const configs = await base44.asServiceRole.entities.AppConfig.list();
  const manusApiKey = configs.find(c => c.key === 'manus_api_key')?.value;
  if (!manusApiKey) {
    return Response.json({ error: 'Manus API Key not configured' }, { status: 400 });
  }

  // Get Google Drive output folder ID — auto-extract ID from full URL if needed
  let outputFolderId = configs.find(c => c.key === 'gdrive_output_folder_id')?.value || '';
  if (outputFolderId.includes('drive.google.com')) {
    const match = outputFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) outputFolderId = match[1];
  }
  console.log('Google Drive output folder ID:', outputFolderId || '(not configured)');

  // Check task status on Manus
  console.log('Checking Manus task status for:', job.manus_task_id);
  const taskRes = await fetch(`${MANUS_BASE}/tasks/${job.manus_task_id}`, {
    headers: { 'API_KEY': manusApiKey },
  });

  if (!taskRes.ok) {
    const errText = await taskRes.text();
    return Response.json({ error: 'Failed to get task status', details: errText }, { status: 500 });
  }

  const taskData = await taskRes.json();
  console.log('Task status:', taskData.status);

  if (taskData.status === 'pending' || taskData.status === 'running') {
    return Response.json({ status: taskData.status, message: 'Task still processing' });
  }

  if (taskData.status === 'failed') {
    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'failed',
      error_message: taskData.error || 'Manus task failed',
    });
    return Response.json({ status: 'failed', error: taskData.error });
  }

  // Task completed — find Excel file in output
  let excelFileUrl = null;
  let excelFileName = null;

  if (taskData.output && Array.isArray(taskData.output)) {
    for (const msg of taskData.output) {
      if (msg.content && Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.fileUrl && (item.fileName?.endsWith('.xlsx') || item.fileName?.endsWith('.xls') || item.mimeType?.includes('spreadsheet'))) {
            excelFileUrl = item.fileUrl;
            excelFileName = item.fileName;
            break;
          }
        }
      }
      if (excelFileUrl) break;
    }
  }

  if (!excelFileUrl) {
    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'failed',
      error_message: 'No Excel file found in Manus output',
    });
    return Response.json({ status: 'failed', error: 'No Excel file in output' });
  }

  console.log('Found Excel file:', excelFileName, excelFileUrl);

  // Download Excel from Manus
  const excelRes = await fetch(excelFileUrl);
  if (!excelRes.ok) {
    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'failed',
      error_message: 'Failed to download Excel from Manus',
    });
    return Response.json({ status: 'failed', error: 'Failed to download Excel' });
  }
  const excelBuffer = await excelRes.arrayBuffer();

  // Upload Excel to Google Drive Folder B
  let gdriveFileId = null;
  if (outputFolderId) {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    const metadata = {
      name: excelFileName || `${job.filename.replace('.pdf', '')}_extracted.xlsx`,
      parents: [outputFolderId],
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    // Use multipart upload to Google Drive
    const boundary = 'ocr_boundary_' + Date.now();
    const metadataStr = JSON.stringify(metadata);

    const encoder = new TextEncoder();
    const metaPart = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n`
    );
    const filePart = encoder.encode(`--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`);
    const endPart = encoder.encode(`\r\n--${boundary}--`);

    const body = new Uint8Array(metaPart.length + filePart.length + excelBuffer.byteLength + endPart.length);
    body.set(metaPart, 0);
    body.set(filePart, metaPart.length);
    body.set(new Uint8Array(excelBuffer), metaPart.length + filePart.length);
    body.set(endPart, metaPart.length + filePart.length + excelBuffer.byteLength);

    console.log('Uploading Excel to Google Drive...');
    const driveRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (driveRes.ok) {
      const driveData = await driveRes.json();
      gdriveFileId = driveData.id;
      console.log('Uploaded to Google Drive:', gdriveFileId, driveData.webViewLink);
    } else {
      const errText = await driveRes.text();
      console.error('Google Drive upload failed:', driveRes.status, errText);
    }
  } else {
    console.warn('No Google Drive output folder ID configured — skipping upload');
  }

  // Update job as completed
  await base44.entities.OcrJob.update(ocr_job_id, {
    status: 'completed',
    output_file_url: excelFileUrl,
    gdrive_file_id: gdriveFileId || '',
  });

  return Response.json({
    status: 'completed',
    excel_url: excelFileUrl,
    gdrive_file_id: gdriveFileId,
  });
});