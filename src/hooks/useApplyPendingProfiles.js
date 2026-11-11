import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateEmployeeId } from '@/utils/employeeId';

export const PENDING_PREFIX = 'pending_profile:';

export async function savePendingProfile(email, profile) {
  const key = PENDING_PREFIX + email.trim().toLowerCase();
  const existing = await base44.entities.AppConfig.filter({ key });
  const value = JSON.stringify(profile);
  if (existing[0]) await base44.entities.AppConfig.update(existing[0].id, { value });
  else await base44.entities.AppConfig.create({ key, value, description: 'ข้อมูลผู้ใช้ที่รอสมัคร (เติมอัตโนมัติเมื่อผู้ใช้เข้าระบบ)' });
}

// When invited users have joined, apply the profile saved at invite time + auto employee_id
export function useApplyPendingProfiles(users, enabled) {
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !users.length || running.current) return;
    running.current = true;
    (async () => {
      const pendings = await base44.entities.AppConfig.filter({ key: { $regex: '^' + PENDING_PREFIX } });
      const working = [...users];
      let applied = 0;
      for (const p of pendings) {
        const email = p.key.slice(PENDING_PREFIX.length);
        const u = working.find(x => x.email?.toLowerCase() === email);
        if (!u) continue;
        const profile = JSON.parse(p.value || '{}');
        const dept = profile.departments?.[0] || profile.department;
        const employee_id = u.employee_id || (dept ? generateEmployeeId(dept, working) : undefined);
        const data = { ...profile, ...(employee_id ? { employee_id } : {}) };
        await base44.functions.invoke('updateUser', { userId: u.id, data });
        Object.assign(u, { employee_id });
        await base44.entities.AppConfig.delete(p.id);
        applied++;
      }
      if (applied) queryClient.invalidateQueries({ queryKey: ['users'] });
      running.current = false;
    })();
  }, [users, enabled, queryClient]);
}