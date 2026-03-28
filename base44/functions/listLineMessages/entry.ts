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

    let messages = await base44.asServiceRole.entities.LineMessage.filter(
      {},
      '-created_date',
      limit
    );

    // SDK may return stringified JSON
    if (typeof messages === 'string') {
      try {
        messages = JSON.parse(messages);
      } catch (parseErr) {
        // If standard parse fails, try to salvage by finding complete JSON objects
        console.error('JSON parse failed, attempting recovery:', parseErr.message);
        const items = [];
        const regex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
        let match;
        while ((match = regex.exec(messages)) !== null) {
          try {
            items.push(JSON.parse(match[0]));
          } catch { /* skip malformed */ }
        }
        messages = items;
      }
    }

    return Response.json({ messages: Array.isArray(messages) ? messages : [] });
  } catch (error) {
    console.error('List LINE messages error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});