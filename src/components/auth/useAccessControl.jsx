import { useMemo } from 'react';

/**
 * Access control hook based on user role and departments.
 *
 * Rules:
 * - admin, management, manager → can see ALL data
 * - super_supervisor → can see data only in their departments
 * - staff → can see data only in their departments
 *
 * User can belong to multiple departments (user.departments array).
 * Falls back to user.department (single) for backward compatibility.
 */
export function useAccessControl(user) {
  return useMemo(() => {
    if (!user) return { canSeeAll: false, userDepartments: [], filterByDepartment: () => [] };

    const role = user.role || 'staff';
    const canSeeAll = ['admin', 'management', 'manager'].includes(role);

    // Collect user departments — support both array and single field
    const depts = user.departments && user.departments.length > 0
      ? user.departments
      : user.department ? [user.department] : [];

    const userDepartments = depts;

    /**
     * Filter an array of records by department field.
     * Admin/management/manager see everything.
     * Others see only records matching their departments, plus records with no department set.
     */
    const filterByDepartment = (records, deptField = 'department') => {
      if (canSeeAll) return records;
      return records.filter(r => {
        const recordDept = r[deptField];
        if (!recordDept) return true; // no department = visible to all
        return userDepartments.includes(recordDept);
      });
    };

    /**
     * Check if user can access a specific department's data
     */
    const canAccessDepartment = (dept) => {
      if (canSeeAll) return true;
      if (!dept) return true;
      return userDepartments.includes(dept);
    };

    return { canSeeAll, userDepartments, filterByDepartment, canAccessDepartment, role };
  }, [user]);
}