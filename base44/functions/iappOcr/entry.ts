import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const IAPP_API_KEY = Deno.env.get('AIGEN_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, ocr_type } = body;
    // ocr_type: 'document' | 'document_layout' | 'document_docx' | 'receipt'

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Download the file from URL
    const fileResp = await fetch(file_url);
    if (!fileResp.ok) {
      return Response.json({ error: 'Failed to download file' }, { status: 400 });
    }
    const fileBlob = await fileResp.blob();
    
    // Determine filename from URL
    const urlPath = new URL(file_url).pathname;
    const filename = urlPath.split('/').pop() || 'document.jpg';

    // Select endpoint based on ocr_type
    let endpoint;
    switch (ocr_type) {
      case 'document':
        endpoint = 'https://api.iapp.co.th/v3/store/ocr/document/ocr';
        break;
      case 'document_layout':
        endpoint = 'https://api.iapp.co.th/v3/store/ocr/document/layout';
        break;
      case 'document_docx':
        endpoint = 'https://api.iapp.co.th/v3/store/ocr/document/docx';
        break;
      case 'receipt':
        endpoint = 'https://api.iapp.co.th/ocr/v3/receipt/file';
        break;
      default:
        endpoint = 'https://api.iapp.co.th/v3/store/ocr/document/ocr';
    }

    // Build form data
    const formData = new FormData();
    formData.append('file', fileBlob, filename);
    
    if (ocr_type === 'receipt') {
      formData.append('return_image', 'false');
      formData.append('return_ocr', 'true');
    }

    console.log(`Calling iApp OCR: ${endpoint} for file: ${filename}`);

    const ocrResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': IAPP_API_KEY,
      },
      body: formData,
    });

    if (!ocrResp.ok) {
      const errText = await ocrResp.text();
      console.error('iApp OCR error:', ocrResp.status, errText);
      return Response.json({ error: `iApp OCR error: ${ocrResp.status}`, details: errText }, { status: 500 });
    }

    // For docx endpoint, response is a file
    if (ocr_type === 'document_docx') {
      const contentType = ocrResp.headers.get('content-type') || '';
      if (contentType.includes('application/') && !contentType.includes('json')) {
        // It's a file response - upload to Base44
        const docxBlob = await ocrResp.blob();
        const docxFile = new File([docxBlob], filename.replace(/\.[^.]+$/, '.docx'), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const { file_url: docxUrl } = await base44.integrations.Core.UploadFile({ file: docxFile });
        return Response.json({ success: true, ocr_type, docx_url: docxUrl });
      }
    }

    const result = await ocrResp.json();
    console.log('iApp OCR result keys:', Object.keys(result));

    return Response.json({ success: true, ocr_type, result });
  } catch (error) {
    console.error('iApp OCR function error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});