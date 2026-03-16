import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to read all messages (including those created by webhook/service)
    const messages = await base44.asServiceRole.entities.LineMessage.filter({}, '-created_date', 500);

    return Response.json({ messages });
  } catch (error) {
    console.error('List LINE messages error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});