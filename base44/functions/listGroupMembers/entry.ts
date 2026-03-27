import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { group_id } = await req.json();
    if (!group_id) {
      return Response.json({ members: [] });
    }

    const members = await base44.asServiceRole.entities.LineGroupMember.filter(
      { group_id },
      'display_name',
      100
    );

    return Response.json({ members });
  } catch (error) {
    console.error('listGroupMembers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});