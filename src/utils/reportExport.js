import { base44 } from '@/api/base44Client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function elementToPdfBlob(el) {
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const img = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pw) / canvas.width;
  let heightLeft = imgH, position = 0;
  pdf.addImage(img, 'PNG', 0, position, pw, imgH);
  heightLeft -= ph;
  while (heightLeft > 0) {
    position -= ph;
    pdf.addPage();
    pdf.addImage(img, 'PNG', 0, position, pw, imgH);
    heightLeft -= ph;
  }
  return pdf.output('blob');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadPdf(blob, filename) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  const res = await base44.integrations.Core.UploadFile({ file });
  return res?.file_url || null;
}

export async function emailReport({ users, fromName, subject, html }) {
  const recipients = users.filter((u) => ['admin', 'management'].includes(u.role) && u.user_status !== 'inactive' && u.email);
  let sent = 0;
  for (const u of recipients) {
    try {
      await base44.integrations.Core.SendEmail({ from_name: fromName, to: u.email, subject, body: html });
      sent++;
    } catch (_) { /* skip failed */ }
  }
  return sent;
}