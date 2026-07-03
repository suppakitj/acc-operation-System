import { base44 } from '@/api/base44Client';

const SCHEMA = {
  type: 'object',
  properties: {
    executive_summary: { type: 'string' },
    highlights:        { type: 'array', items: { type: 'string' } },
    concerns:          { type: 'array', items: { type: 'string' } },
    recommendations:   { type: 'array', items: { type: 'string' } },
    risk_flags:        { type: 'array', items: { type: 'string' } },
  },
  required: ['executive_summary', 'highlights', 'concerns', 'recommendations'],
};

export async function generateKpiNarrative(reportData) {
  const prompt =
`คุณคือที่ปรึกษาเชิงกลยุทธ์ระดับผู้บริหารของสำนักงานบัญชีและที่ปรึกษา ACC Consulting Co., Ltd.
วิเคราะห์ชุด KPI ของงวดต่อไปนี้ แล้วเขียนบทสรุปสำหรับที่ประชุมคณะผู้บริหาร (board-level)
โทน: กระชับ ตรงประเด็น เชิงกลยุทธ์ อ้างอิงตัวเลขจริง หลีกเลี่ยงคำฟุ่มเฟือย เขียนเป็นภาษาไทย

ข้อกำหนด:
- executive_summary: 3-5 ประโยค ภาพรวมสุขภาพองค์กร แนวโน้ม และประเด็นสำคัญที่สุด
- highlights: 3-5 ข้อ ความสำเร็จ/จุดแข็งที่วัดได้
- concerns: 2-4 ข้อ ประเด็นที่ต้องเฝ้าระวัง พร้อมตัวเลขอ้างอิง
- recommendations: 3-5 ข้อ คำแนะนำเชิงปฏิบัติสำหรับผู้บริหาร
- risk_flags: ความเสี่ยงเร่งด่วน (ถ้ามี) ถ้าไม่มีให้ส่ง array ว่าง

DATA (JSON):
${JSON.stringify(reportData)}

ตอบเป็น JSON object ตาม schema เท่านั้น ห้ามมีข้อความอื่นนอก JSON`;

  try {
    const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
    return typeof res === 'string' ? JSON.parse(res.replace(/```json|```/g, '').trim()) : res;
  } catch (e) {
    return { executive_summary: 'ไม่สามารถสร้างบทวิเคราะห์อัตโนมัติได้ในขณะนี้', highlights: [], concerns: [], recommendations: [], risk_flags: [], _error: String(e) };
  }
}