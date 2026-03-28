import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 200, 500);

    // Fetch only incoming messages from last 30 days + all outgoing for matching
    const messages = await base44.asServiceRole.entities.LineMessage.filter(
      {},
      '-created_date',
      limit
    );

    return Response.json({ messages });
  } catch (error) {
    console.error('List LINE messages error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});