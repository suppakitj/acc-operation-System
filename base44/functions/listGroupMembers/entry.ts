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

    // First check DB cache
    const dbMembers = await base44.asServiceRole.entities.LineGroupMember.filter(
      { group_id },
      'display_name',
      100
    );

    // If we have members cached, return them
    if (dbMembers.length > 0) {
      return Response.json({ members: dbMembers });
    }

    // Otherwise, fetch from LINE API directly
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const accessToken = configs.find(c => c.key === 'line_access_token')?.value || '';
    if (!accessToken) {
      return Response.json({ members: [] });
    }

    const allMembers = [];
    let nextToken = null;

    // Paginate through group members (LINE returns max 100 per call)
    do {
      const url = nextToken
        ? `https://api.line.me/v2/bot/group/${group_id}/members/ids?start=${nextToken}`
        : `https://api.line.me/v2/bot/group/${group_id}/members/ids`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        console.warn('Failed to fetch group member IDs:', res.status);
        break;
      }

      const data = await res.json();
      const memberIds = data.memberUserIds || [];
      nextToken = data.next || null;

      // Fetch profile for each member
      for (const memberId of memberIds) {
        try {
          const profileRes = await fetch(
            `https://api.line.me/v2/bot/group/${group_id}/member/${memberId}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );
          if (profileRes.ok) {
            const profile = await profileRes.json();
            const member = {
              group_id,
              line_user_id: memberId,
              display_name: profile.displayName || memberId.substring(0, 8),
              picture_url: profile.pictureUrl || '',
            };
            allMembers.push(member);

            // Save to DB for cache
            try {
              await base44.asServiceRole.entities.LineGroupMember.create(member);
            } catch (e) {
              // Ignore duplicate errors
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch profile for ${memberId}:`, e.message);
        }
      }
    } while (nextToken);

    return Response.json({ members: allMembers });
  } catch (error) {
    console.error('listGroupMembers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});