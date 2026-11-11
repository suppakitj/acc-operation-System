// Employee ID prefixes per department
const DEPT_PREFIX = {
  management: 'MD',
  accounting: 'ACC',
  consulting: 'ACC',
  audit: 'AC',
  billing: 'ACC',
  it: 'IT',
};
const DEPT_START = {
  management: 1, accounting: 1, consulting: 1001, audit: 1, billing: 2001, it: 1,
};

export function generateEmployeeId(department, existingUsers) {
  const prefix = DEPT_PREFIX[department] || 'EMP';
  const start = DEPT_START[department] || 1;

  const existingIds = existingUsers
    .filter(u => u.employee_id?.startsWith(prefix + '-'))
    .map(u => {
      const num = parseInt(u.employee_id.split('-')[1]);
      return isNaN(num) ? 0 : num;
    })
    .filter(n => n >= start);

  const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : start - 1;
  return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
}