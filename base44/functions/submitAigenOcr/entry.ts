import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

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

function arrayBufferToBase64(buffer) {
  const uint8 = new Uint8Array(buffer);
  let base64 = '';
  const CHUNK = 8192;
  for (let i = 0; i < uint8.length; i += CHUNK) {
    base64 += String.fromCharCode(...uint8.slice(i, i + CHUNK));
  }
  return btoa(base64);
}

async function splitPdfToPages(pdfBytes) {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const pageCount = srcDoc.getPageCount();
  const pages = [];

  for (let i = 0; i < pageCount; i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(copiedPage);
    const singlePageBytes = await newDoc.save();
    pages.push(singlePageBytes);
  }

  return pages;
}

async function callAigenApi(apiUrl, apiKey, base64Data) {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'x-aigen-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image: base64Data }),
  });

  const text = await res.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`AiGen response parse error: ${text.substring(0, 500)}`);
  }

  const hasError = result.status === 'error' ||
    (result.error && Array.isArray(result.error) && result.error.length > 0 && result.error.some(e => e.code === 'bad_request'));

  if (!res.ok || hasError) {
    const errorMsg = result.error?.[0]?.message || result.message || `AiGen API error: ${res.status}`;
    throw new Error(errorMsg);
  }

  return result;
}

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

  await base44.entities.OcrJob.update(ocr_job_id, { status: 'processing' });

  try {
    console.log('Downloading file from:', job.file_url);
    const fileRes = await fetch(job.file_url);
    if (!fileRes.ok) throw new Error('Failed to download file');
    const fileBuffer = await fileRes.arrayBuffer();

    const apiUrl = `${AIGEN_BASE}${endpoint}`;
    const isPdf = job.filename?.toLowerCase().endsWith('.pdf') || 
                  fileRes.headers.get('content-type')?.includes('pdf');

    let mergedResult;

    if (isPdf) {
      // Split PDF into single pages and call API per page
      const pages = await splitPdfToPages(fileBuffer);
      console.log(`PDF has ${pages.length} pages — processing each page separately`);

      const allData = [];
      let lastRequestId = '';

      for (let i = 0; i < pages.length; i++) {
        console.log(`Processing page ${i + 1}/${pages.length}...`);
        const base64 = arrayBufferToBase64(pages[i]);
        const pageResult = await callAigenApi(apiUrl, apiKey, base64);
        lastRequestId = pageResult.request_id || lastRequestId;

        // Collect data from each page
        if (Array.isArray(pageResult.data)) {
          // Add page number to each data item
          pageResult.data.forEach(item => {
            allData.push({ ...item, _page: i + 1 });
          });
        }
      }

      mergedResult = {
        status: 'success',
        request_id: lastRequestId,
        error: [],
        data: allData,
        _total_pages: pages.length,
      };
    } else {
      // Single image — call API once
      const base64 = arrayBufferToBase64(fileBuffer);
      console.log(`Calling AiGen ${docType} (${endpoint}), base64 size: ${base64.length}`);
      mergedResult = await callAigenApi(apiUrl, apiKey, base64);
    }

    console.log('AiGen OCR completed, total data items:', mergedResult.data?.length || 0);

    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'completed',
      aigen_result: mergedResult,
    });

    return Response.json({ success: true, result: mergedResult });
  } catch (error) {
    console.error('AiGen OCR error:', error.message);
    await base44.entities.OcrJob.update(ocr_job_id, {
      status: 'failed',
      error_message: error.message,
    });
    return Response.json({ error: error.message }, { status: 500 });
  }
});