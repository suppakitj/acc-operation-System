import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Only process task updates where status changed to completed
    if (event?.type !== 'update') {
      return Response.json({ status: 'skipped', reason: 'not an update event' });
    }

    if (data?.status !== 'completed') {
      return Response.json({ status: 'skipped', reason: 'status is not completed' });
    }

    // Skip if completed_date is already set
    if (data.completed_date) {
      return Response.json({ status: 'skipped', reason: 'completed_date already set' });
    }

    // Set completed_date to today (Bangkok timezone)
    const now = new Date();
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokDate = new Date(now.getTime() + bangkokOffset).toISOString().split('T')[0];

    await base44.asServiceRole.entities.Task.update(event.entity_id, {
      completed_date: bangkokDate,
    });

    console.log(`Auto-set completed_date=${bangkokDate} for task ${event.entity_id}`);
    return Response.json({ status: 'ok', completed_date: bangkokDate });

  } catch (error) {
    console.error('autoSetCompletedDate error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});