import { computeScorecard3E } from './staffKpi';

const clamp = (v) => Math.max(0, Math.min(100, v));
const LEVEL_WEIGHT = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
const MOOD_SCORE   = { great: 100, good: 80, neutral: 60, stressed: 35, burned_out: 10 };

const yearsBetween = (a, b) => (a ? (new Date(b) - new Date(a)) / (365.25 * 86400000) : null);

function tenureScore(user, asOf) {
  const yrs = yearsBetween(user.hire_date || user.created_date, asOf);
  if (yrs == null || isNaN(yrs)) return 50;
  return clamp((yrs / 5) * 100);
}

function skillsScore(email, skills) {
  const mine = skills.filter((s) => s.user_email === email && !s.is_goal);
  if (mine.length === 0) return 0;
  const depth = mine.reduce((s, x) => s + (LEVEL_WEIGHT[x.level] || 1), 0);
  const breadth = new Set(mine.map((s) => s.category)).size;
  return Math.round(clamp((depth / 40) * 100) * 0.6 + clamp((breadth / 6) * 100) * 0.4);
}

function learningVelocityScore(email, skills, knowledgeArticles, asOf) {
  const cutoff = new Date(asOf); cutoff.setFullYear(cutoff.getFullYear() - 1);
  const recentSkills = skills.filter((s) => s.user_email === email && !s.is_goal && s.created_date && new Date(s.created_date) >= cutoff).length;
  const authored = knowledgeArticles.filter((a) => a.author_email === email && a.status === 'published' && a.published_at && new Date(a.published_at) >= cutoff).length;
  return Math.round(clamp((recentSkills / 4) * 100) * 0.7 + clamp((authored / 3) * 100) * 0.3);
}

function engagementScore(email, pulses, shoutOuts) {
  const mine = pulses.filter((p) => p.user_email === email);
  const moodAvg = mine.length ? mine.reduce((s, p) => s + (MOOD_SCORE[p.mood] ?? 60), 0) / mine.length : 60;
  const received = clamp(shoutOuts.filter((s) => s.to_email === email).length * 5);
  return Math.round(moodAvg * 0.8 + received * 0.2);
}

export function computePotential({ user, skills, pulses, shoutOuts, knowledgeArticles, asOf }) {
  const t  = tenureScore(user, asOf);
  const s  = skillsScore(user.email, skills);
  const lv = learningVelocityScore(user.email, skills, knowledgeArticles, asOf);
  const e  = engagementScore(user.email, pulses, shoutOuts);
  return {
    potential: Math.round(t * 0.30 + s * 0.30 + lv * 0.20 + e * 0.20),
    breakdown: { tenure: Math.round(t), skills: s, learning_velocity: lv, engagement: e },
  };
}

const band = (v) => (v >= 80 ? 2 : v >= 60 ? 1 : 0);
const BOX = {
  '2-2': { code: 9, label: 'Star',                  th: 'ดาวเด่น',              action: 'Retain & stretch — succession candidate',      color: 'emerald' },
  '2-1': { code: 8, label: 'High Performer',        th: 'ผลงานสูง',             action: 'Reward; broaden scope',                        color: 'green' },
  '2-0': { code: 7, label: 'Trusted Professional',  th: 'มืออาชีพน่าเชื่อถือ',   action: 'Retain in role; deepen expertise',             color: 'teal' },
  '1-2': { code: 6, label: 'High Potential',        th: 'ศักยภาพสูง',           action: 'Accelerate development; new challenges',       color: 'blue' },
  '1-1': { code: 5, label: 'Core Player',           th: 'กำลังหลัก',            action: 'Engage & grow; steady investment',             color: 'sky' },
  '1-0': { code: 4, label: 'Effective',             th: 'ทำงานได้ผล',           action: 'Maintain; targeted upskilling',                color: 'cyan' },
  '0-2': { code: 3, label: 'Raw Talent',            th: 'เพชรยังไม่เจียระไน',    action: 'Diagnose blockers; coach intensively',         color: 'amber' },
  '0-1': { code: 2, label: 'Inconsistent',          th: 'ผลงานไม่สม่ำเสมอ',      action: 'Close performance gap; clarify expectations',  color: 'orange' },
  '0-0': { code: 1, label: 'Underperformer',        th: 'ต่ำกว่าเกณฑ์',          action: 'PIP / role-fit review',                        color: 'red' },
};
export function classifyBox(performance, potential) { return BOX[`${band(performance)}-${band(potential)}`]; }

export function buildTalentMatrix({ users, tasks, timeEntries, meetingNotes, skills = [], pulses = [], shoutOuts = [], knowledgeArticles = [], from, to }) {
  const asOf = to || new Date().toISOString().slice(0, 10);
  return users
    .filter((u) => u.user_status !== 'inactive')
    .map((u) => {
      const sc = computeScorecard3E({ email: u.email, role: u.role || 'staff', tasks, timeEntries, meetingNotes, user: u, from, to });
      const pot = computePotential({ user: u, skills, pulses, shoutOuts, knowledgeArticles, asOf });
      return { user: u, performance: sc.overall, potential: pot.potential, potentialBreakdown: pot.breakdown, box: classifyBox(sc.overall, pot.potential), has_sufficient_data: sc.has_sufficient_data };
    });
}