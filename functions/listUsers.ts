import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await base44.asServiceRole.entities.User.list();

    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      department: u.department,
      departments: u.departments,
      position: u.position,
      employee_id: u.employee_id,
      user_status: u.user_status,
      username: u.username,
      phone: u.phone,
      nickname: u.nickname || '',
      initials: u.initials || '',
      created_date: u.created_date,
      updated_date: u.updated_date,
    }));

    return Response.json({ users: safeUsers });
  } catch (error) {
    console.error('listUsers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});