export function reasonToText(err) {
  switch (err?.reason) {
    case 'staff_cannot_complete':
      return 'ไม่สามารถปิดงานเองได้ — ต้องส่งตรวจให้หัวหน้า approve';
    case 'checklist_incomplete':
      return `Checklist ยังไม่ครบ (${err.checked}/${err.total}) — กรุณาทำให้ครบก่อน`;
    case 'needs_review':
      return 'งานนี้มีผู้ตรวจกำหนดไว้ — ต้องส่งตรวจก่อนปิด';
    case 'taken':
      return `งานนี้ถูก ${err.taken_by || 'คนอื่น'} รับไปแล้ว`;
    case 'forbidden': return 'ไม่มีสิทธิ์ดำเนินการนี้';
    case 'invalid_status': return 'สถานะงานไม่รองรับการดำเนินการนี้';
    default: return 'ดำเนินการไม่สำเร็จ';
  }
}