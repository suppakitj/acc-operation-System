import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    let total = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.asServiceRole.entities.LineMessage.filter(
        { is_read: false, direction: 'incoming' }, '-created_date', 50
      );

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Update with delay to avoid rate limiting
      for (let i = 0; i < batch.length; i++) {
        try {
          await base44.asServiceRole.entities.LineMessage.update(batch[i].id, { is_read: true });
          total++;
        } catch (e) {
          if (e.status === 429) {
            // Wait and retry
            await sleep(2000);
            await base44.asServiceRole.entities.LineMessage.update(batch[i].id, { is_read: true });
            total++;
          } else {
            console.error('Update failed for', batch[i].id, e.message);
          }
        }
        // Small delay between updates to avoid rate limit
        if (i % 5 === 4) await sleep(500);
      }

      if (batch.length < 50) hasMore = false;
    }

    return Response.json({ status: 'ok', marked: total });
  } catch (error) {
    console.error('markAllLineRead error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});