/**
 * Q5-A: time-weighted revenue attribution from Billing → per-staff, plus cost & financial KPIs.
 */

const inRange = (d, from, to) => !!d && d >= from && d <= to;
const RECOGNIZED = ['paid', 'sent', 'overdue']; // exclude draft / cancelled / not_invoiced

function billingInPeriod(b, from, to) {
  if (b.period_month) {
    const m = `${b.period_month}-01`;
    return m >= `${from.slice(0, 7)}-01` && m <= to;
  }
  return inRange(b.billing_date, from, to);
}

export function attributeRevenuePerStaff({ billings = [], timeEntries = [], from, to }) {
  // 1) Recognized revenue per customer
  const revByCustomer = {};
  billings
    .filter((b) => RECOGNIZED.includes(b.status) && billingInPeriod(b, from, to))
    .forEach((b) => {
      const rev = b.service_amount || b.amount || 0;
      revByCustomer[b.customer_id] = (revByCustomer[b.customer_id] || 0) + rev;
    });

  // 2) Minutes per (customer → staff) and per customer
  const custStaffMin = {}, custTotalMin = {};
  timeEntries
    .filter((e) => inRange((e.start_time || '').slice(0, 10), from, to) && e.customer_id)
    .forEach((e) => {
      const c = e.customer_id, mins = e.duration_minutes || 0;
      (custStaffMin[c] = custStaffMin[c] || {});
      custStaffMin[c][e.user_email] = (custStaffMin[c][e.user_email] || 0) + mins;
      custTotalMin[c] = (custTotalMin[c] || 0) + mins;
    });

  // 3) Distribute
  const staffRevenue = {};
  const unattributed = { revenue: 0, customers: [] };
  Object.entries(revByCustomer).forEach(([cid, rev]) => {
    const total = custTotalMin[cid] || 0;
    if (total <= 0) { unattributed.revenue += rev; unattributed.customers.push(cid); return; }
    Object.entries(custStaffMin[cid]).forEach(([email, mins]) => {
      staffRevenue[email] = (staffRevenue[email] || 0) + rev * (mins / total);
    });
  });
  Object.keys(staffRevenue).forEach((k) => { staffRevenue[k] = Math.round(staffRevenue[k]); });

  return { staffRevenue, revByCustomer, unattributed };
}

export function computeStaffCost({ email, users, timeEntries, from, to }) {
  const rate = (users.find((u) => u.email === email)?.hourly_cost) || 0;
  const hours = timeEntries
    .filter((e) => e.user_email === email && inRange((e.start_time || '').slice(0, 10), from, to))
    .reduce((s, e) => s + (e.duration_minutes || 0), 0) / 60;
  return { hours: Math.round(hours * 10) / 10, cost: Math.round(hours * rate) };
}

export function computeFinancialKpis({ users, billings, timeEntries, from, to }) {
  const { staffRevenue, revByCustomer, unattributed } = attributeRevenuePerStaff({ billings, timeEntries, from, to });
  const totalRevenue = Object.values(revByCustomer).reduce((a, b) => a + b, 0);
  const active = users.filter((u) => u.user_status !== 'inactive');
  const fte = active.length || 1;
  const totalCost = active.reduce((s, u) => s + computeStaffCost({ email: u.email, users, timeEntries, from, to }).cost, 0);
  return {
    totalRevenue,
    revenuePerFte: Math.round(totalRevenue / fte),
    totalCost,
    grossMarginPct: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : null,
    costEfficiency: totalCost > 0 ? Math.round((totalRevenue / totalCost) * 100) / 100 : null,
    staffRevenue,
    unattributedRevenue: unattributed.revenue,
  };
}