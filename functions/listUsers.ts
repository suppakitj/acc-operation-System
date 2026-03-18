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

    // Debug: log all emails and check for nickname/initials
    console.log('Total users:', users.length);
    console.log('Emails:', users.map(u => u.email).join(', '));
    const withInitials = users.filter(u => u.nickname || u.initials);
    console.log('Users with nickname/initials:', withInitials.length);
    if (withInitials.length > 0) {
      console.log('Sample:', JSON.stringify({ email: withInitials[0].email, nickname: withInitials[0].nickname, initials: withInitials[0].initials }));
    }

    // Return all user data fields needed by frontend
    const safeUsers = users.map(u => ({
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
      nickname: u.nickname || u.data?.nickname,
      initials: u.initials || u.data?.initials,
      created_date: u.created_date,
      updated_date: u.updated_date,
    }));

    return Response.json({ users: safeUsers });
  } catch (error) {
    console.error('listUsers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});