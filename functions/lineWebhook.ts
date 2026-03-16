import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'node:crypto';

Deno.serve(async (req) => {
  // Handle GET requests (LINE webhook verification)
  if (req.method === 'GET') {
    return Response.json({ status: 'ok' }, { status: 200 });
  }

  try {
    // IMPORTANT: Read body BEFORE createClientFromRequest (which may consume the request)
    const body = await req.text();

    // Empty body = verification ping
    if (!body || body.trim() === '') {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    // Parse early to check for empty events (LINE verification POST)
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    // LINE sends empty events array for verification - return 200 immediately
    if (!payload.events || payload.events.length === 0) {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    // Now initialize SDK (need it only for actual message processing)
    const base44 = createClientFromRequest(req);

    // Get LINE config from AppConfig (service role since this is a webhook with no user)
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const getVal = (key) => configs.find(c => c.key === key)?.value || '';
    const channelSecret = getVal('line_channel_secret');
    const accessToken = getVal('line_access_token');

    if (!channelSecret || !accessToken) {
      return Response.json({ error: 'LINE OA not configured' }, { status: 400 });
    }

    // Verify LINE signature if present
    const signature = req.headers.get('x-line-signature');
    if (signature && channelSecret) {
      const hmac = createHmac('SHA256', channelSecret);
      hmac.update(body);
      const expectedSig = hmac.digest('base64');
      if (signature !== expectedSig) {
        console.error('Invalid LINE signature');
        return Response.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const payload = JSON.parse(body);
    const events = payload.events || [];

    // LINE sends empty events array for verification
    if (events.length === 0) {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    for (const event of events) {
      if (event.type === 'message') {
        const userId = event.source?.userId;
        const messageType = event.message?.type || 'text';
        const content = event.message?.text || `[${messageType}]`;

        // Fetch user profile from LINE
        let displayName = userId;
        let profileImage = '';
        try {
          const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            displayName = profile.displayName || userId;
            profileImage = profile.pictureUrl || '';
          }
        } catch (e) {
          console.warn('Failed to fetch LINE profile:', e.message);
        }

        // Save message to LineMessage entity (service role)
        await base44.asServiceRole.entities.LineMessage.create({
          line_user_id: userId,
          display_name: displayName,
          profile_image: profileImage,
          message_type: messageType,
          content: content,
          direction: 'incoming',
          is_read: false,
        });

        console.log(`Saved incoming message from ${displayName}: ${content}`);
      }
    }

    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('LINE webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});