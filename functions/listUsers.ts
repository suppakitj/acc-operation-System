import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to list all users (bypasses User entity security rules)
    const users = await base44.asServiceRole.entities.User.list();

    // Return all user data fields needed by frontend
    const safeUsers = users.map(u => {
      const obj = {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role || u.data?.role,
        department: u.department || u.data?.department,
        departments: u.departments || u.data?.departments,
        position: u.position || u.data?.position,
        employee_id: u.employee_id || u.data?.employee_id,
        user_status: u.user_status || u.data?.user_status,
        username: u.username || u.data?.username,
        phone: u.phone || u.data?.phone,
        nickname: u.nickname || u.data?.nickname || '',
        initials: u.initials || u.data?.initials || '',
        created_date: u.created_date,
        updated_date: u.updated_date,
      };
      return obj;
    });

    return Response.json({ users: safeUsers });
  } catch (error) {
    console.error('listUsers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});