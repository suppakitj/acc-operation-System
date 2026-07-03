import { computeScorecard3E } from './staffKpi';

const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function computePeerContext({ users, tasks, timeEntries, meetingNotes, from, to }) {
  const ranked = users.map((u) => {
    const sc = computeScorecard3E({
      email: u.email, role: u.role || 'staff',
      tasks, timeEntries, meetingNotes, user: u, from, to,
    });
    return { ...sc, user: u };
  }).filter((r) => r.has_sufficient_data).sort((a, b) => b.overall - a.overall);

  return {
    ranked,
    peerMedian: {
      overall: Math.round(median(ranked.map((r) => r.overall))),
      e1: Math.round(median(ranked.map((r) => r.dimensions.execution.score))),
      e2: Math.round(median(ranked.map((r) => r.dimensions.effectiveness.score))),
      e3: Math.round(median(ranked.map((r) => r.dimensions.efficiency.score))),
    },
    subMedian: {
      rework_rate: median(ranked.map((r) => r.dimensions.effectiveness.rework_rate)),
      on_time_rate: median(ranked.map((r) => r.dimensions.efficiency.on_time_rate)),
    },
    count: ranked.length,
  };
}

function rankOf(email, ranked) {
  const i = ranked.findIndex((r) => r.user.email === email);
  return i >= 0 ? { rank: i + 1, of: ranked.length } : null;
}

function trajectory(trend) {
  if (trend.length < 2) return { delta: null, plateau: false, direction: 'flat' };
  const delta = trend[trend.length - 1].score - trend[0].score;
  const recent = trend.slice(-3).map((t) => t.score);
  const plateau = recent.length === 3 && (Math.max(...recent) - Math.min(...recent) <= 2);
  const direction = delta >= 4 ? 'improving' : delta <= -4 ? 'declining' : 'flat';
  return { delta, plateau, direction };
}

export function generateEvaluationInsights({ scorecard, peer, trend, email }) {
  const { overall, dimensions: d } = scorecard;
  const traj = trajectory(trend);
  const rank = rankOf(email, peer.ranked);
  const strengths = [], development = [], coaching = [];

  // Strengths
  if (d.effectiveness.score >= 85 || d.effectiveness.score - peer.peerMedian.e2 >= 8)
    strengths.push(`คุณภาพงานสูง — E2 ${d.effectiveness.score} เทียบค่ากลางทีม ${peer.peerMedian.e2}`);
  if (d.execution.score >= 85 || d.execution.score - peer.peerMedian.e1 >= 8)
    strengths.push(`ปริมาณงานครบถ้วน — E1 ${d.execution.score} เทียบ ${peer.peerMedian.e1}`);
  if (d.efficiency.score >= 85 || d.efficiency.score - peer.peerMedian.e3 >= 8)
    strengths.push(`ความตรงเวลาโดดเด่น — E3 ${d.efficiency.score} เทียบ ${peer.peerMedian.e3}`);
  if (d.effectiveness.critical_finding_rate === 0) strengths.push('ไม่พบ critical finding ตลอดงวดประเมิน');
  if (traj.direction === 'improving') strengths.push(`พัฒนาต่อเนื่อง +${traj.delta} จุดตลอดช่วงที่ติดตาม`);

  // Development
  if (d.efficiency.score < peer.peerMedian.e3 - 3) development.push(`ความตรงเวลาต่ำกว่าค่ากลาง — E3 ${d.efficiency.score} vs ${peer.peerMedian.e3}`);
  if (d.effectiveness.rework_rate > peer.subMedian.rework_rate) development.push(`Rework สูงกว่าค่ากลาง — ${Math.round(d.effectiveness.rework_rate * 100)}% vs ${Math.round(peer.subMedian.rework_rate * 100)}%`);
  if (traj.plateau) development.push(`คะแนนคงที่ 3 งวดล่าสุด (~${trend[trend.length - 1].score}) — ภาวะ plateau`);
  if (traj.direction === 'declining') development.push(`แนวโน้มลดลง ${traj.delta} จุด — ควรวิเคราะห์สาเหตุ`);
  if (d.efficiency.overdue_open > 0) development.push(`งานค้างเลยกำหนด ${d.efficiency.overdue_open} รายการ`);

  // Coaching
  const weakest = [['E1', d.execution.score], ['E2', d.effectiveness.score], ['E3', d.efficiency.score]].sort((a, b) => a[1] - b[1])[0];
  const COACH = { E1: 'ทบทวน capacity กับหัวหน้า ลดงาน WIP และกระจายภาระงาน', E2: 'เพิ่ม self-review + checklist ก่อนส่ง จับคู่ peer-review', E3: 'แตก task ย่อย ตั้ง milestone และสื่อสาร blocker ให้เร็วขึ้น' };
  coaching.push(COACH[weakest[0]]);
  if (d.effectiveness.score >= 88) coaching.push('พิจารณามอบบทบาท mentor ให้ทีม junior เพื่อ leverage จุดแข็งด้านคุณภาพ');

  // Recommended action + compensation signal
  let recommendedAction, compensationSignal, actionTone;
  if (overall >= 85 && traj.direction !== 'declining') { recommendedAction = 'Retain & Reward'; compensationSignal = 'พิจารณา merit increase 5–7%'; actionTone = 'green'; }
  else if (overall >= 75) { recommendedAction = 'Retain & Develop'; compensationSignal = 'ปรับตามตลาด / มาตรฐาน'; actionTone = 'green'; }
  else if (overall >= 60) { recommendedAction = 'Coach & Monitor'; compensationSignal = 'คงเดิม ทบทวนงวดถัดไป'; actionTone = 'amber'; }
  else { recommendedAction = 'Performance Plan (PIP)'; compensationSignal = 'ยังไม่ปรับ วางแผนพัฒนาแบบมีโครงสร้าง'; actionTone = 'red'; }
  if (traj.direction === 'declining' && overall >= 75) { recommendedAction = 'Retain but Monitor — แนวโน้มลด'; actionTone = 'amber'; }

  return { strengths, development, coaching, recommendedAction, compensationSignal, actionTone, rank, trajectory: traj };
}