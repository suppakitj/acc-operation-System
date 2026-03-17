import { useMemo } from 'react';
import { usePermissionMatrix, getPerm } from '@/hooks/usePermissionMatrix';

export function useAccessControl(user) {
  const matrix = usePermissionMatrix();

  return useMemo(() => {
    if (!user) return empty();

    const role = user.role || 'staff';
    const email = user.email || '';

    const depts = user.departments?.length
      ? user.departments
      : user.department ? [user.department] : [];

    // Helper: get perm value from matrix
    const p = (cap) => getPerm(matrix, cap, role);

    // ─── page-level access ───────────────────────────────────
    const canManageUsers         = p('user_master') === 'yes';
    const canManageRoles         = p('role_mgmt') === 'yes';
    const customerPerm           = p('customer');
    const canManageCustomers     = customerPerm !== 'no';
    const canAddCustomer         = customerPerm === 'yes' || customerPerm === 'dept';
    const canDeleteCustomer      = customerPerm === 'yes';
    const canEditCustomer        = customerPerm !== 'no'; // edit_only, yes, dept all can edit
    const canManageTemplates     = p('template') === 'yes';
    const canManageTemplatesDept = p('template') === 'dept';
    const canViewBilling         = p('view_billing') === 'yes';
    const canViewBillingDept     = p('view_billing') === 'dept';
    const canViewPeakAccount     = p('peak') !== 'no';
    const crossGroup             = p('cross_group') === 'yes';

    // ─── task-level permissions ──────────────────────────────
    const canEditAssignee = p('edit_assignee') !== 'no';
    const canAddTask      = p('add_task') !== 'no';

    const canChangeDueDate = (task) => {
      const v = p('change_due');
      if (v === 'yes' || v === 'dept') return true;
      if (v === 'own') return task?.assigned_to === email || task?.created_by === email;
      return false;
    };

    const canChangeStatus = (task) => {
      const v = p('change_status');
      if (v === 'yes' || v === 'dept') return true;
      if (v === 'own') return task?.assigned_to === email || task?.created_by === email;
      return false;
    };

    // ─── data filtering ──────────────────────────────────────
    const filterByDepartment = (records, deptField = 'department') => {
      if (crossGroup || p('view_task') === 'yes') return records;
      return records.filter(r => {
        const rd = r[deptField];
        if (!rd) return true;
        return depts.includes(rd);
      });
    };

    const canAccessDepartment = (dept) => {
      if (crossGroup || p('view_task') === 'yes') return true;
      if (!dept) return true;
      return depts.includes(dept);
    };

    // ─── schedule visibility ──────────────────────────────────
    const canViewAllSchedules = p('view_schedule') === 'yes';

    // ─── sidebar menu visibility ─────────────────────────────
    const getVisibleMenuIds = () => {
      const menus = ['dashboard', 'notifications', 'settings'];

      if (p('view_task') !== 'no')       menus.push('tasks');
      if (p('view_schedule') !== 'no')   menus.push('schedule');
      if (p('customer') !== 'no')        menus.push('customers');
      if (p('template') !== 'no')        menus.push('templates');
      if (p('peak') !== 'no')            menus.push('peak');
      if (p('view_billing') !== 'no')    menus.push('billing');
      if (p('user_master') !== 'no')     menus.push('users');
      if (p('role_mgmt') !== 'no')       menus.push('roles');

      // line_chat → always visible
      menus.push('line_chat');

      // reports, audit, backup → same as cross_group (admin-level)
      if (crossGroup) menus.push('reports', 'audit');
      if (role === 'admin') menus.push('backup');

      return menus;
    };

    return {
      role, email, userDepartments: depts,
      canManageUsers, canManageRoles, canManageCustomers,
      canAddCustomer, canDeleteCustomer, canEditCustomer,
      canManageTemplates, canManageTemplatesDept,
      canViewBilling, canViewBillingDept,
      canViewPeakAccount, canViewAllSchedules,
      canEditAssignee, canAddTask, canChangeDueDate, canChangeStatus,
      filterByDepartment, canAccessDepartment,
      getVisibleMenuIds,
      canSeeAll: crossGroup,
    };
  }, [user, matrix]);
}

function empty() {
  return {
    role: '', email: '', userDepartments: [],
    canManageUsers: false, canManageRoles: false, canManageCustomers: false,
    canAddCustomer: false, canDeleteCustomer: false, canEditCustomer: false,
    canManageTemplates: false, canManageTemplatesDept: false,
    canViewBilling: false, canViewBillingDept: false,
    canViewPeakAccount: false, canViewAllSchedules: false,
    canEditAssignee: false, canAddTask: false,
    canChangeDueDate: () => false, canChangeStatus: () => false,
    filterByDepartment: () => [], canAccessDepartment: () => false,
    getVisibleMenuIds: () => ['dashboard', 'notifications', 'settings'],
    canSeeAll: false,
  };
}