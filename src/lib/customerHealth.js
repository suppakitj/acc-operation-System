// Customer Health Score computation — shared logic

export const GRADE_CONFIG = {
  A: { label: 'ดีเยี่ยม', color: 'green', description: 'ลูกค้าชั้นดี ทำงานง่าย' },
  B: { label: 'ดี', color: 'teal', description: 'ทำงานได้ปกติ' },
  C: { label: 'ปานกลาง', color: 'yellow', description: 'มีบางจุดที่ต้องระวัง' },
  D: { label: 'งานยาก', color: 'orange', description: 'ควร review ค่าบริการ' },
  F: { label: 'ต้อง reprice', color: 'red', description: 'ต้นทุนสูงกว่ารายได้มาก' },
};

export function computeCustomerHealthScore(customerId, tasks, timeEntries) {
  const custTasks = tasks.filter(t => t.customer_id === customerId);
  const custEntries = timeEntries.filter(e => e.customer_id === customerId);

  if (custTasks.length === 0) return { score: null, grade: 'N/A' };

  // DIMENSION 1: On-Time Delivery (40 points)
  const completed = custTasks.filter(t => t.status === 'completed' && t.completed_date);
  const onTime = completed.filter(t => t.due_date && t.completed_date.slice(0, 10) <= t.due_date.slice(0, 10));
  const onTimeRate = completed.length > 0 ? onTime.length / completed.length : 1;
  const dim1 = Math.round(onTimeRate * 40);

  // DIMENSION 2: Due Date Stability (30 points)
  const avgChanges = custTasks.length > 0
    ? custTasks.reduce((s, t) => s + (t.due_date_change_count || 0), 0) / custTasks.length
    : 0;
  let dim2 = 30;
  if (avgChanges >= 3) dim2 = 0;
  else if (avgChanges >= 2) dim2 = 10;
  else if (avgChanges >= 1) dim2 = 20;

  // DIMENSION 3: Time Efficiency (30 points)
  const custHours = custEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0) / 60;
  const avgHoursPerTask = custTasks.length > 0 ? custHours / custTasks.length : 0;
  let dim3 = 30;
  if (avgHoursPerTask >= 10) dim3 = 0;
  else if (avgHoursPerTask >= 6) dim3 = 10;
  else if (avgHoursPerTask >= 3) dim3 = 20;

  const totalScore = dim1 + dim2 + dim3;
  const grade = totalScore >= 80 ? 'A' : totalScore >= 65 ? 'B' : totalScore >= 50 ? 'C' : totalScore >= 35 ? 'D' : 'F';

  return {
    score: totalScore,
    grade,
    dim1_ontime: dim1,
    dim2_stability: dim2,
    dim3_efficiency: dim3,
    onTimeRate: Math.round(onTimeRate * 100),
    avgDueDateChanges: avgChanges.toFixed(1),
    avgHoursPerTask: avgHoursPerTask.toFixed(1),
    totalTasks: custTasks.length,
    completedTasks: completed.length,
    totalHours: custHours.toFixed(1),
  };
}

export function getRecommendations(healthData) {
  if (!healthData || healthData.score === null) return [];
  const recs = [];
  if (healthData.dim1_ontime < 20)
    recs.push('📋 On-Time Rate ต่ำ — ตรวจสอบว่าทีมมี workload เกินหรือลูกค้าส่งข้อมูลช้า');
  if (healthData.dim2_stability < 15)
    recs.push('📅 Due Date เปลี่ยนบ่อย — ควรกำหนด deadline policy ที่ชัดเจนกับลูกค้า');
  if (healthData.dim3_efficiency < 15)
    recs.push('⏱️ ใช้เวลาต่องานสูง — พิจารณา reprice หรือ review scope of work');
  if (healthData.score < 35)
    recs.push('🔴 Score ต่ำมาก — แนะนำให้ MD พิจารณา renegotiate contract');
  return recs;
}