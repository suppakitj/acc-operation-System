import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to list all users (bypasses User entity security rules)
    const users = await base44.asServiceRole.entities.User.list();

    // Return only safe fields (no sensitive data)
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      department: u.department,
      position: u.position,
      created_date: u.created_date,
    }));

    return Response.json({ users: safeUsers });
  } catch (error) {
    console.error('listUsers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});