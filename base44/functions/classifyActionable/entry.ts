import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const INTENTS = ['request', 'question', 'fyi', 'social', 'complaint'];
const URGENCY = ['low', 'medium', 'high', 'urgent'];

function bangkokDate() {
  // YYYY-MM-DD in Asia/Bangkok
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { message, message_id, chat_type, sender_name, customer_name, received_at } = await req.json();

    const text = (message || '').trim();
    if (!text || text.length < 8 || !message_id) {
      return Response.json({ classified: false });
    }

    // Daily quota
    const today = bangkokDate();
    const countKey = `llm_classify_count_${today.replace(/-/g, '')}`;
    const limitRec = await base44.asServiceRole.entities.AppConfig.filter({ key: 'llm_classify_daily_limit' });
    const limit = Number(limitRec[0]?.value) || 300;
    const countRec = await base44.asServiceRole.entities.AppConfig.filter({ key: countKey });
    const used = Number(countRec[0]?.value) || 0;
    if (used >= limit) {
      console.warn(`classifyActionable quota reached (${used}/${limit})`);
      return Response.json({ classified: false, reason: 'quota' });
    }
    if (countRec[0]) {
      await base44.asServiceRole.entities.AppConfig.update(countRec[0].id, { value: String(used + 1) });
    } else {
      await base44.asServiceRole.entities.AppConfig.create({ key: countKey, value: '1', description: 'ตัวนับการเรียก LLM คัดกรองข้อความ LINE รายวัน' });
    }

    const prompt = `คุณเป็นผู้ช่วยคัดกรองข้อความของสำนักงานบัญชีและภาษีในประเทศไทย ลูกค้าคุยกับสำนักงานผ่าน LINE
วันที่ปัจจุบัน (เวลาไทย Asia/Bangkok): ${today}
เวลาที่ได้รับข้อความ: ${received_at || '-'}
ประเภทแชท: ${chat_type || '-'} | ผู้ส่ง: ${sender_name || '-'} | ลูกค้า: ${customer_name || '-'}

ข้อความ:
"""${text}"""

งานของคุณ:
1. ตัดสินว่าข้อความนี้ "เรียกร้องให้สำนักงานทำอะไรบางอย่าง" หรือไม่ (is_actionable) เช่น ขอเอกสาร ขอส่งงบ ขอให้โทรติดต่อหน่วยงาน ขอนัดหมาย
2. ระบุ intent: request / question / fyi / social / complaint
3. other_category: หมวดงานสั้น ๆ ภาษาไทย เช่น 'ขอเอกสาร' 'นัดหมาย' 'สอบถามภาษี'
4. summary_th: สรุปสิ่งที่ลูกค้าต้องการให้เราทำ 1 บรรทัด ไม่เกิน 120 ตัวอักษร
5. due_date: แปลงกำหนดส่งเป็น YYYY-MM-DD โดยอิงวันที่ปัจจุบันข้างต้น (เช่น "พรุ่งนี้" "สิ้นเดือน" "วันที่ 15") ห้ามเดา ถ้าข้อความไม่ได้ระบุกำหนดให้เว้นว่าง และ due_date_text คือข้อความต้นฉบับที่บอกกำหนด
6. urgency: low / medium / high / urgent
7. ถ้าข้อความกำกวม มีคำปฏิเสธ (ไม่ต้อง ยังไม่ ยกเลิก) หรือตีความได้หลายทาง ให้ requires_human_confirm = true
8. confidence: ความมั่นใจ 0-1`;

    const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          is_actionable: { type: 'boolean' },
          intent: { type: 'string', enum: INTENTS },
          other_category: { type: 'string' },
          summary_th: { type: 'string' },
          due_date: { type: 'string' },
          due_date_text: { type: 'string' },
          urgency: { type: 'string', enum: URGENCY },
          requires_human_confirm: { type: 'boolean' },
          confidence: { type: 'number' },
        },
        required: ['is_actionable', 'intent', 'confidence'],
      },
    });

    const dueOk = typeof r.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.due_date);
    const update = {
      is_actionable: r.is_actionable === true,
      intent: INTENTS.includes(r.intent) ? r.intent : 'unknown',
      other_category: r.other_category || undefined,
      summary_th: r.summary_th ? String(r.summary_th).slice(0, 120) : undefined,
      llm_confidence: typeof r.confidence === 'number' ? r.confidence : undefined,
      extracted_due_date: dueOk ? r.due_date : undefined,
      due_date_text: r.due_date_text || undefined,
      needs_review: r.requires_human_confirm === true,
      classified_by: 'llm',
      triage_status: 'new',
    };
    if (URGENCY.includes(r.urgency)) update.auto_priority = r.urgency;

    await base44.asServiceRole.entities.LineMessage.update(message_id, update);
    return Response.json({ classified: true, result: update });
  } catch (error) {
    console.error('classifyActionable error:', error.message);
    return Response.json({ classified: false, error: error.message }, { status: 200 });
  }
}