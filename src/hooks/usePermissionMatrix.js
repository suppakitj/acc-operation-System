import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_MATRIX = {
  login:          { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  user_master:    { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  role_mgmt:      { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  customer:       { admin: 'yes', management: 'yes', manager: 'no',  super_supervisor: 'yes', staff: 'no' },
  template:       { admin: 'yes', management: 'yes', manager: 'dept',super_supervisor: 'dept',staff: 'no' },
  view_task:      { admin: 'yes', management: 'yes', manager: 'dept',super_supervisor: 'dept',staff: 'dept' },
  edit_assignee:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'no' },
  change_due:     { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'own' },
  change_status:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'own' },
  add_task:       { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'yes', staff: 'yes' },
  view_billing:   { admin: 'yes', management: 'yes', manager: 'dept',super_supervisor: 'dept',staff: 'no' },
  view_schedule:  { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'dept',staff: 'dept' },
  cross_group:    { admin: 'yes', management: 'no',  manager: 'no',  super_supervisor: 'no',  staff: 'no' },
  peak:           { admin: 'yes', management: 'yes', manager: 'yes', super_supervisor: 'no',  staff: 'no' },
};

export function usePermissionMatrix() {
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'permission_matrix'],
    queryFn: () => base44.entities.AppConfig.filter({ key: 'permission_matrix' }),
    staleTime: 60000,
  });

  const savedOverrides = (() => {
    const cfg = configs.find(c => c.key === 'permission_matrix');
    if (cfg?.value) {
      try { return JSON.parse(cfg.value); } catch { return {}; }
    }
    return {};
  })();

  // Merge saved overrides into default
  const matrix = {};
  for (const [key, defaults] of Object.entries(DEFAULT_MATRIX)) {
    matrix[key] = { ...defaults, ...(savedOverrides[key] || {}) };
  }

  return matrix;
}

/**
 * Get the permission value for a capability+role from a matrix object.
 * Returns 'yes' | 'no' | 'dept' | 'own'
 */
export function getPerm(matrix, capability, role) {
  return matrix?.[capability]?.[role] || 'no';
}