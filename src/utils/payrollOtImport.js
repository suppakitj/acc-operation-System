import * as XLSX from 'xlsx';

const B_OFFSET = 543;
const n = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

function toISO(thai) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(thai || '').trim());
  if (!m) return null;
  const d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0'), gy = parseInt(m[3], 10) - B_OFFSET;
  return `${gy}-${mo}-${d}`;
}

function findMeta(rows, label) {
  for (let r = 0; r < Math.min(rows.length, 18); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (row[c] && String(row[c]).includes(label)) {
        for (let cc = c + 1; cc < row.length; cc++) {
          const v = row[cc];
          if (v != null && String(v).trim()) return String(v).trim();
        }
      }
    }
  }
  return '';
}

export function parsePayrollOt(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const batchId = `import_${Date.now()}`;
  const out = [];
  wb.SheetNames.forEach((name) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
    const user_name = findMeta(rows, '\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E02\u0E2D');
    const employee_status = findMeta(rows, '\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19');
    const department = findMeta(rows, '\u0E41\u0E1C\u0E19\u0E01');
    const supervisor_name = findMeta(rows, '\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19');
    rows.forEach((row) => {
      const iso = toISO(row[2]);
      if (!iso) return;
      const normal = n(row[20]) * 60 + n(row[22]);
      const hw = n(row[25]) * 60 + n(row[27]);
      const hot = n(row[28]) * 60 + n(row[29]);
      if (normal + hw + hot === 0 && !String(row[5] || '').trim()) return;
      out.push({
        employee_code: String(name).trim(),
        user_name, employee_status, department, supervisor_name,
        ot_date: iso, period_month: iso.slice(0, 7),
        task_description: String(row[5] || '').trim(),
        approver_name: String(row[18] || '').trim(),
        requested_from: String(row[11] || ''),
        requested_to: String(row[12] || ''),
        actual_start: String(row[14] || ''),
        actual_end: String(row[17] || ''),
        normal_ot_minutes: normal,
        holiday_work_minutes: hw,
        holiday_ot_minutes: hot,
        total_minutes: normal + hw + hot,
        is_holiday: (hw + hot) > 0,
        source_batch_id: batchId,
      });
    });
  });
  return { entries: out, batchId };
}