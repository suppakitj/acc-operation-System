import { useMemo } from 'react';

/**
 * Centralized Role Matrix for ACC Consulting.
 *
 * Capability               Admin  Management  Manager          SuperSupervisor   Staff
 * ───────────────────────── ─────  ──────────  ──────────────── ───────────────── ─────────────
 * Login                    ✓      ✓           ✓                ✓                 ✓
 * User Master & Mgmt       ✓      ✗           ✗                ✗                 ✗
 * User Role Mgmt            ✓      ✗           ✗                ✗                 ✗
 * Customer Master           ✓      ✓           ✗                ✓                 ✗
 * Task Template             ✓      ✓           own dept         own dept          ✗
 * View Tasks                ✓      ✓           own dept         own dept          own dept
 * Edit assignee             ✓      ✓           ✓                ✓                 ✗
 * Change due date           ✓      ✓           ✓                ✓                 own tasks
 * Change status             ✓      ✓           ✓                ✓                 own tasks
 * Add task manual           ✓      ✓           ✓                ✓                 ✓
 * View billing              ✓      ✓           own dept         own dept          ✗
 * View schedule/team        ✓      ✓           ✓                own dept          own dept
 * Cross-group viewing       ✓      ✗           ✗                ✗                 ✗
 * Peak Account Mgmt         ✓      ✓           ✓                ✗                 ✗
 */

export function useAccessControl(user) {
  return useMemo(() => {
    if (!user) return empty();

    const role = user.role || 'staff';
    const email = user.email || '';

    const depts = user.departments?.length
      ? user.departments
      : user.department ? [user.department] : [];

    // ─── helpers ──────────────────────────────────────────────
    const is = (...roles) => roles.includes(role);
    const isFullAccess = is('admin');              // cross-group
    const isManagement = is('management');
    const isManager = is('manager');
    const isSuperSupervisor = is('super_supervisor');
    const isStaff = is('staff');

    // ─── page-level access ───────────────────────────────────
    const canManageUsers        = is('admin');
    const canManageRoles        = is('admin');
    const canManageCustomers    = is('admin', 'management', 'manager', 'super_supervisor');
    const canManageTemplates    = is('admin', 'management'); // full; manager/super = dept only
    const canManageTemplatesDept= is('manager', 'super_supervisor');
    const canViewBilling        = is('admin', 'management'); // full; manager/super = dept only
    const canViewBillingDept    = is('manager', 'super_supervisor');
    const canViewPeakAccount    = is('admin', 'management', 'manager');

    // ─── task-level permissions ──────────────────────────────
    const canEditAssignee       = !isStaff;
    const canAddTask            = true;  // everyone

    /** Can this user change due_date for a given task? */
    const canChangeDueDate = (task) => {
      if (!isStaff) return true;
      return task?.assigned_to === email || task?.created_by === email;
    };

    /** Can this user change status for a given task? */
    const canChangeStatus = (task) => {
      if (!isStaff) return true;
      return task?.assigned_to === email || task?.created_by === email;
    };

    // ─── data filtering ──────────────────────────────────────
    /** Filter records by department visibility */
    const filterByDepartment = (records, deptField = 'department') => {
      if (isFullAccess || isManagement) return records;
      // Manager, super_supervisor, staff → own departments only
      return records.filter(r => {
        const rd = r[deptField];
        if (!rd) return true;
        return depts.includes(rd);
      });
    };

    /** Check if user can see a specific department */
    const canAccessDepartment = (dept) => {
      if (isFullAccess || isManagement) return true;
      if (!dept) return true;
      return depts.includes(dept);
    };

    // ─── schedule visibility ──────────────────────────────────
    // Admin/Management/Manager → all; SuperSupervisor/Staff → own dept
    const canViewAllSchedules = is('admin', 'management', 'manager');

    // ─── sidebar menu visibility ─────────────────────────────
    const getVisibleMenuIds = () => {
      // Everyone always sees these
      const always = ['dashboard', 'tasks', 'notifications', 'settings'];
      const menus = [...always];

      // schedule
      menus.push('schedule');

      if (canManageCustomers)         menus.push('customers');
      if (canManageTemplates || canManageTemplatesDept) menus.push('templates');
      if (canViewPeakAccount)         menus.push('peak');
      if (canViewBilling || canViewBillingDept) menus.push('billing');
      if (canManageUsers)             menus.push('users');
      if (canManageRoles)             menus.push('roles');

      // reports, line_chat, audit → admin/management only
      if (is('admin', 'management'))  menus.push('reports', 'line_chat', 'audit');

      return menus;
    };

    return {
      role, email, userDepartments: depts,
      // page access
      canManageUsers, canManageRoles, canManageCustomers,
      canManageTemplates, canManageTemplatesDept,
      canViewBilling, canViewBillingDept,
      canViewPeakAccount, canViewAllSchedules,
      // task
      canEditAssignee, canAddTask, canChangeDueDate, canChangeStatus,
      // data
      filterByDepartment, canAccessDepartment,
      // sidebar
      getVisibleMenuIds,
      // legacy compat
      canSeeAll: isFullAccess || isManagement,
    };
  }, [user]);
}

function empty() {
  return {
    role: '', email: '', userDepartments: [],
    canManageUsers: false, canManageRoles: false, canManageCustomers: false,
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