const MULT_DEFAULT = { normal: 1.5, holiday_work: 1.0, holiday_ot: 3.0 };
const min2h = (m) => Math.round((m / 60) * 10) / 10;

export function entryCost(e, hourlyCost, mult = MULT_DEFAULT) {
  const r = hourlyCost || 0;
  return (e.normal_ot_minutes / 60) * r * mult.normal
       + (e.holiday_work_minutes / 60) * r * mult.holiday_work
       + (e.holiday_ot_minutes / 60) * r * mult.holiday_ot;
}

export function aggregateByPerson({ entries, users, mult = MULT_DEFAULT }) {
  const uByCode = {};
  users.forEach((u) => { const code = String(u.payroll_code || u.employee_id || '').trim(); if (code) uByCode[code] = u; });
  const map = {};
  entries.forEach((e) => {
    const u = uByCode[e.employee_code];
    const k = e.employee_code || e.user_email || e.user_name;
    if (!map[k]) map[k] = {
      code: e.employee_code, name: e.user_name || u?.nickname || u?.full_name || k,
      email: u?.email || e.user_email || null, department: e.department || u?.department || '',
      status: e.employee_status || '', hourly_cost: u?.hourly_cost || 0,
      normalMin: 0, hwMin: 0, hotMin: 0, occ: 0, cost: 0,
    };
    const m = map[k];
    m.normalMin += e.normal_ot_minutes || 0;
    m.hwMin += e.holiday_work_minutes || 0;
    m.hotMin += e.holiday_ot_minutes || 0;
    m.occ++;
    m.cost += entryCost(e, m.hourly_cost, mult);
  });
  return Object.values(map).map((m) => ({
    ...m,
    normalH: min2h(m.normalMin),
    holidayWorkH: min2h(m.hwMin),
    holidayOtH: min2h(m.hotMin),
    totalH: min2h(m.normalMin + m.hwMin + m.hotMin),
    cost: Math.round(m.cost),
  })).sort((a, b) => b.totalH - a.totalH);
}

export function aggregateByMonth(entries) {
  const map = {};
  entries.forEach((e) => { map[e.period_month] = (map[e.period_month] || 0) + (e.total_minutes || 0); });
  return Object.entries(map).sort().map(([month, min]) => ({ month, hours: min2h(min) }));
}

export function aggregateByCause(entries) {
  const map = {};
  entries.forEach((e) => { const k = e.cause_code || 'untagged'; map[k] = (map[k] || 0) + (e.total_minutes || 0); });
  return Object.entries(map).map(([cause, min]) => ({ cause, hours: min2h(min) })).sort((a, b) => b.hours - a.hours);
}

export function aggregateByCustomer(entries) {
  const map = {};
  entries.forEach((e) => {
    const k = e.customer_name || e.customer_id || '(\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32)';
    map[k] = (map[k] || 0) + (e.total_minutes || 0);
  });
  return Object.entries(map).map(([customer, min]) => ({ customer, hours: min2h(min) })).sort((a, b) => b.hours - a.hours).slice(0, 15);
}

export function firmOtSummary({ entries, users, mult = MULT_DEFAULT }) {
  const per = aggregateByPerson({ entries, users, mult });
  const totalH = Math.round(per.reduce((s, p) => s + p.totalH, 0) * 10) / 10;
  const holidayH = Math.round(per.reduce((s, p) => s + p.holidayWorkH + p.holidayOtH, 0) * 10) / 10;
  const cost = per.reduce((s, p) => s + p.cost, 0);
  const top3 = [...per].slice(0, 3).reduce((s, p) => s + p.totalH, 0);
  return {
    totalH, holidayH,
    holidayPct: totalH ? Math.round((holidayH / totalH) * 100) : 0,
    cost,
    staffCount: per.length,
    avgH: per.length ? Math.round((totalH / per.length) * 10) / 10 : 0,
    concentrationTop3Pct: totalH ? Math.round((top3 / totalH) * 100) : 0,
    per,
  };
}

export function breakEvenHire({ otCost, spanDays, fteAnnualCost }) {
  const annualOt = spanDays > 0 ? otCost * (365 / spanDays) : otCost;
  return {
    annualOt: Math.round(annualOt),
    equivalentFtes: fteAnnualCost > 0 ? Math.round((annualOt / fteAnnualCost) * 100) / 100 : null,
  };
}