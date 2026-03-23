import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { line_user_id, message, display_name, chat_type } = await req.json();

    if (!line_user_id || !message) {
      return Response.json({ error: 'line_user_id and message are required' }, { status: 400 });
    }

    // Get LINE access token from AppConfig
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'line_access_token' }, '-created_date', 1);
    const accessToken = configs[0]?.value || '';

    if (!accessToken) {
      return Response.json({ error: 'LINE OA access token not configured.' }, { status: 400 });
    }

    // Send message via LINE Push API
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: line_user_id,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!lineRes.ok) {
      const errBody = await lineRes.text();
      console.error('LINE API error:', lineRes.status, errBody);
      return Response.json({ error: `LINE API error: ${lineRes.status} - ${errBody}` }, { status: 502 });
    }

    // Save outgoing message to LineMessage entity
    await base44.asServiceRole.entities.LineMessage.create({
      line_user_id,
      display_name: display_name || line_user_id,
      content: message,
      direction: 'outgoing',
      message_type: 'text',
      is_read: true,
      replied_by: user.email,
      chat_type: chat_type || 'user',
    });

    console.log(`Sent message to ${line_user_id}: ${message}`);
    return Response.json({ status: 'sent' });
  } catch (error) {
    console.error('Send message error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});