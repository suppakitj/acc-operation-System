/**
 * Universal period + comparison-baseline resolver for all BI pages.
 * Fiscal-year-aware. Default fiscal start month = January.
 */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y, m) => new Date(y, m, 0).getDate(); // m is 1-based

export const FISCAL_START_DEFAULT = 1; // January

const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export function monthRange(year, month) {
  return { from: ymd(year, month, 1), to: ymd(year, month, lastDay(year, month)) };
}

export function quarterRange(fiscalYear, quarter, fiscalStart = FISCAL_START_DEFAULT) {
  const startAbs = fiscalStart + (quarter - 1) * 3;
  const sYear = fiscalYear + Math.floor((startAbs - 1) / 12);
  const sMonth = ((startAbs - 1) % 12) + 1;
  const endAbs = startAbs + 2;
  const eYear = fiscalYear + Math.floor((endAbs - 1) / 12);
  const eMonth = ((endAbs - 1) % 12) + 1;
  return { from: ymd(sYear, sMonth, 1), to: ymd(eYear, eMonth, lastDay(eYear, eMonth)) };
}

export function yearRange(fiscalYear, fiscalStart = FISCAL_START_DEFAULT) {
  const endAbs = fiscalStart + 11;
  const eYear = fiscalYear + Math.floor((endAbs - 1) / 12);
  const eMonth = ((endAbs - 1) % 12) + 1;
  return { from: ymd(fiscalYear, fiscalStart, 1), to: ymd(eYear, eMonth, lastDay(eYear, eMonth)) };
}

// state = { type, month:'YYYY-MM', year:Number, quarter:1-4, from, to }
export function resolvePeriod(state, fiscalStart = FISCAL_START_DEFAULT) {
  if (state.type === 'monthly') {
    const [y, m] = state.month.split('-').map(Number);
    return { ...monthRange(y, m), key: state.month, label: `${TH_MONTHS[m - 1]} ${y + 543}` };
  }
  if (state.type === 'quarterly')
    return { ...quarterRange(state.year, state.quarter, fiscalStart), key: `${state.year}-Q${state.quarter}`, label: `Q${state.quarter}/${state.year + 543}` };
  if (state.type === 'yearly')
    return { ...yearRange(state.year, fiscalStart), key: `${state.year}`, label: `ปี ${state.year + 543}` };
  return { from: state.from, to: state.to, key: `${state.from}_${state.to}`, label: `${state.from} → ${state.to}` };
}

export function shiftPeriod(state, dir /* -1 | +1 */) {
  const s = { ...state };
  if (s.type === 'monthly') {
    let [y, m] = s.month.split('-').map(Number);
    m += dir; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    s.month = `${y}-${pad(m)}`;
  } else if (s.type === 'quarterly') {
    let q = s.quarter + dir, y = s.year;
    if (q < 1) { q = 4; y--; } if (q > 4) { q = 1; y++; }
    s.quarter = q; s.year = y;
  } else if (s.type === 'yearly') {
    s.year += dir;
  }
  return s;
}

export function resolveComparison(baseline, state, fiscalStart = FISCAL_START_DEFAULT) {
  if (baseline === 'previous_period') return resolvePeriod(shiftPeriod(state, -1), fiscalStart);
  if (baseline === 'same_period_last_year') {
    const s = { ...state };
    if (s.type === 'monthly') { const [y, m] = s.month.split('-').map(Number); s.month = `${y - 1}-${pad(m)}`; }
    else if (s.type === 'custom') {
      const shift = (d) => { const dt = new Date(d); dt.setFullYear(dt.getFullYear() - 1); return dt.toISOString().slice(0, 10); };
      s.from = shift(s.from); s.to = shift(s.to);
    } else { s.year -= 1; }
    return resolvePeriod(s, fiscalStart);
  }
  return null; // 'peer_group' | 'personal_baseline' | 'custom' → handled in-page
}

export function defaultPeriodState() {
  const now = new Date();
  return {
    type: 'monthly',
    month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
    from: '', to: '',
    comparison: 'previous_period',
  };
}