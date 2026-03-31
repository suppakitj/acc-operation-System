import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AIGEN_BASE = 'https://api.aigen.online/aiscript';

const DOC_TYPE_ENDPOINTS = {
  general_ocr: '/general-ocr/v2',
  general_invoice: '/general-invoice/v2',
  table_extraction: '/table-exraction/v1',
  bank_statement: '/bank-statement/v2',
  payslip: '/payslip/v1',
  idcard: '/idcard/v3',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ocr_job_id } = await req.json();
  if (!ocr_job_id) return Response.json({ error: 'ocr_job_id is required' }, { status: 400 });

  const job = await base44.entities.OcrJob.get(ocr_job_id);
  if (!job || !job.file_url) {
    return Response.json({ error: 'Job not found or no file_url' }, { status: 400 });
  }

  const apiKey = Deno.env.get('AIGEN_API_KEY');
  if (!apiKey) {
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: 'AIGEN API Key not configured' });
    return Response.json({ error: 'AIGEN API Key not configured' }, { status: 400 });
  }

  // Update status to processing
  await base44.entities.OcrJob.update(ocr_job_id, { status: 'processing' });

  // Download the file
  console.log('Downloading file:', job.file_url);
  const fileRes = await fetch(job.file_url);
  if (!fileRes.ok) {
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: 'Failed to download file' });
    return Response.json({ error: 'Failed to download file' }, { status: 500 });
  }

  const fileBuffer = await fileRes.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

  // Determine endpoint
  const docType = job.aigen_doc_type || 'general_ocr';
  const endpoint = DOC_TYPE_ENDPOINTS[docType] || DOC_TYPE_ENDPOINTS.general_ocr;
  const url = `${AIGEN_BASE}${endpoint}`;

  console.log(`Calling aiScript API: ${url} for doc type: ${docType}`);

  // Call aiScript API
  const aigenRes = await fetch(url, {
    method: 'POST',
    headers: {
      'X-AIGEN-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!aigenRes.ok) {
    const errText = await aigenRes.text();
    console.error('aiScript API error:', aigenRes.status, errText);
    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'failed',
      error_message: `aiScript API error (${aigenRes.status}): ${errText.substring(0, 500)}`,
    });
    return Response.json({ error: 'aiScript API failed', details: errText }, { status: 500 });
  }

  const result = await aigenRes.json();
  console.log('aiScript response status:', result.status);

  // Extract text from result based on doc type
  let extractedText = '';
  if (docType === 'general_ocr') {
    // data[].text_page
    extractedText = (result.data || []).map(p => p.text_page || '').join('\n---\n');
  } else if (docType === 'table_extraction') {
    // result[].cells
    const tables = result.result || [];
    extractedText = JSON.stringify(tables, null, 2);
  } else {
    // For invoice, bank_statement, payslip, idcard — store full result
    extractedText = JSON.stringify(result.data || result, null, 2);
  }

  // Save result — truncate if too long for entity field
  const truncated = extractedText.length > 50000 ? extractedText.substring(0, 50000) + '\n... (truncated)' : extractedText;

  await base44.entities.OcrJob.update(ocr_job_id, {
    status: 'completed',
    ocr_result: truncated,
  });

  return Response.json({
    success: true,
    doc_type: docType,
    text_length: extractedText.length,
  });
});