import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const MANUS_BASE = 'https://api.manus.ai/v1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ocr_job_id } = await req.json();
  if (!ocr_job_id) return Response.json({ error: 'ocr_job_id is required' }, { status: 400 });

  // Get OCR job record
  const job = await base44.entities.OcrJob.get(ocr_job_id);
  if (!job || !job.file_url) {
    return Response.json({ error: 'Job not found or no file_url' }, { status: 400 });
  }

  // Get Manus API Key from AppConfig
  const configs = await base44.asServiceRole.entities.AppConfig.list();
  const manusApiKey = configs.find(c => c.key === 'manus_api_key')?.value;
  if (!manusApiKey) {
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: 'Manus API Key not configured' });
    return Response.json({ error: 'Manus API Key not configured' }, { status: 400 });
  }

  const manusHeaders = { 'API_KEY': manusApiKey, 'Content-Type': 'application/json' };

  // Step 1: Create file record on Manus
  console.log('Creating file record on Manus for:', job.filename);
  const fileRes = await fetch(`${MANUS_BASE}/files`, {
    method: 'POST',
    headers: manusHeaders,
    body: JSON.stringify({ filename: job.filename }),
  });

  if (!fileRes.ok) {
    const errText = await fileRes.text();
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: `Manus file create failed: ${errText}` });
    return Response.json({ error: 'Manus file create failed', details: errText }, { status: 500 });
  }

  const fileData = await fileRes.json();
  console.log('Manus file created:', fileData.id);

  // Step 2: Download PDF from our storage
  console.log('Downloading PDF from:', job.file_url);
  const pdfRes = await fetch(job.file_url);
  if (!pdfRes.ok) {
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: 'Failed to download PDF' });
    return Response.json({ error: 'Failed to download PDF' }, { status: 500 });
  }
  const pdfBuffer = await pdfRes.arrayBuffer();

  // Step 3: Upload PDF to Manus presigned URL
  console.log('Uploading PDF to Manus S3...');
  const uploadRes = await fetch(fileData.upload_url, {
    method: 'PUT',
    body: pdfBuffer,
    headers: { 'Content-Type': 'application/pdf' },
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: `Manus upload failed: ${errText}` });
    return Response.json({ error: 'Manus upload failed' }, { status: 500 });
  }
  console.log('PDF uploaded to Manus successfully');

  // Step 4: Create OCR task on Manus
  const prompt = `You are a professional bank statement data extraction expert. 
Please analyze the attached PDF bank statement and extract ALL transactions into an Excel (.xlsx) file.

The Excel file should have the following columns:
- Date (วันที่)
- Time (เวลา) 
- Description (รายการ)
- Withdrawal (ถอน/จ่าย)
- Deposit (ฝาก/รับ)
- Balance (ยอมคงเหลือ)
- Channel (ช่องทาง)

Important instructions:
- Extract EVERY transaction, do not skip any rows
- Keep the original Thai text as-is
- Format dates as DD/MM/YYYY
- Format numbers with 2 decimal places
- If a field is empty, leave it blank
- Add a summary row at the bottom with totals for Withdrawal and Deposit columns
- Name the Excel file: "${job.filename.replace('.pdf', '')}_extracted.xlsx"

Please output the result as an Excel (.xlsx) file.`;

  console.log('Creating Manus OCR task...');
  const taskRes = await fetch(`${MANUS_BASE}/tasks`, {
    method: 'POST',
    headers: manusHeaders,
    body: JSON.stringify({
      prompt,
      agentProfile: 'manus-1.6',
      attachments: [{ type: 'file_id', file_id: fileData.id }],
    }),
  });

  if (!taskRes.ok) {
    const errText = await taskRes.text();
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: `Manus task create failed: ${errText}` });
    return Response.json({ error: 'Manus task create failed', details: errText }, { status: 500 });
  }

  const taskData = await taskRes.json();
  console.log('Manus task created:', taskData.task_id);

  // Update job with task info
  await base44.entities.OcrJob.update(ocr_job_id, {
    status: 'processing',
    manus_task_id: taskData.task_id,
    manus_task_url: taskData.task_url || '',
  });

  return Response.json({
    success: true,
    task_id: taskData.task_id,
    task_url: taskData.task_url,
  });
});