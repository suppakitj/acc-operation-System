import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffISO = cutoff.toISOString();

    // Fetch old audit logs
    const oldLogs = await base44.asServiceRole.entities.AuditLog.filter(
      { created_date: { $lt: cutoffISO } },
      'created_date',
      200
    );

    let deleted = 0;
    for (const log of oldLogs) {
      await base44.asServiceRole.entities.AuditLog.delete(log.id);
      deleted++;
    }

    console.log(`Cleanup: deleted ${deleted} audit logs older than 30 days (cutoff: ${cutoffISO})`);

    return Response.json({ deleted, cutoff: cutoffISO });
  } catch (error) {
    console.error('cleanupAuditLog error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});