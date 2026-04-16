import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  let total = 0;
  let batch;
  do {
    batch = await base44.asServiceRole.entities.LineMessage.filter(
      { is_read: false, direction: 'incoming' }, '-created_date', 100
    );
    for (const m of batch) {
      await base44.asServiceRole.entities.LineMessage.update(m.id, { is_read: true });
      total++;
    }
  } while (batch.length === 100);

  return Response.json({ status: 'ok', marked: total });
});