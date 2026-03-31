import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AIGEN_BASE = 'https://api.aigen.online/aiscript';

// AiGen document type → API endpoint mapping
const DOC_TYPE_ENDPOINTS = {
  'general-ocr': '/general-ocr/v2',
  'bank-statement': '/bank-statement/v3',
  'book-bank': '/book-bank/v1',
  'business-registration': '/business-registration-certificate/v1',
  'driver-licence': '/driver-licence/v1',
  'general-invoice': '/general-invoice/v2',
  'health-check-report': '/health-check-report/v1',
  'hospital-invoice': '/hospital-invoice/v1',
  'house-registration': '/house-registration/v1',
  'idcard': '/idcard/v3',
  'passport': '/passport/v1',
  'payslip': '/payslip/v2',
  'shipping-label': '/shipping-label/v1',
  'table-extraction': '/table-exraction/v1',
  'vehicle-insurance-policy': '/vehicle-insurance-policy/v1',
  'vehicle-registration-book': '/vehicle-registration-book/v1',
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
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: 'AIGEN_API_KEY not configured' });
    return Response.json({ error: 'AIGEN_API_KEY not configured' }, { status: 400 });
  }

  const docType = job.aigen_doc_type || 'general-ocr';
  const endpoint = DOC_TYPE_ENDPOINTS[docType];
  if (!endpoint) {
    await base44.entities.OcrJob.update(ocr_job_id, { status: 'failed', error_message: `Unknown doc type: ${docType}` });
    return Response.json({ error: `Unknown doc type: ${docType}` }, { status: 400 });
  }

  // Update status to processing
  await base44.entities.OcrJob.update(ocr_job_id, { status: 'processing' });

  try {
    // Download file and convert to base64
    console.log('Downloading file from:', job.file_url);
    const fileRes = await fetch(job.file_url);
    if (!fileRes.ok) {
      throw new Error('Failed to download file');
    }
    const fileBuffer = await fileRes.arrayBuffer();
    const uint8 = new Uint8Array(fileBuffer);

    // Convert to base64
    let base64 = '';
    const CHUNK = 8192;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      base64 += String.fromCharCode(...uint8.slice(i, i + CHUNK));
    }
    base64 = btoa(base64);

    console.log(`Calling AiGen ${docType} (${endpoint}), base64 size: ${base64.length}`);

    const apiUrl = `${AIGEN_BASE}${endpoint}`;
    const aigenRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'x-aigen-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64 }),
    });

    const resultText = await aigenRes.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      throw new Error(`AiGen response parse error: ${resultText.substring(0, 500)}`);
    }

    console.log('AiGen response status:', result.status || aigenRes.status);

    // Check for errors in response
    const hasError = result.status === 'error' || 
                     (result.error && Array.isArray(result.error) && result.error.length > 0 && result.error.some(e => e.code === 'bad_request'));

    if (!aigenRes.ok || hasError) {
      const errorMsg = result.error?.[0]?.message || result.message || `AiGen API error: ${aigenRes.status}`;
      await base44.entities.OcrJob.update(ocr_job_id, {
        status: 'failed',
        error_message: errorMsg,
        aigen_result: result,
      });
      return Response.json({ error: errorMsg, details: result }, { status: 500 });
    }

    // Success — store result
    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'completed',
      aigen_result: result,
    });

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('AiGen OCR error:', error.message);
    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'failed',
      error_message: error.message,
    });
    return Response.json({ error: error.message }, { status: 500 });
  }
});