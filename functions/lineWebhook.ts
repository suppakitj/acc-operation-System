import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHmac } from 'node:crypto';

Deno.serve(async (req) => {
  // Handle GET requests (LINE webhook verification)
  if (req.method === 'GET') {
    return Response.json({ status: 'ok' }, { status: 200 });
  }

  try {
    const body = await req.text();

    if (!body || body.trim() === '') {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    if (!payload.events || payload.events.length === 0) {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const getVal = (key) => configs.find(c => c.key === key)?.value || '';
    const channelSecret = getVal('line_channel_secret');
    const accessToken = getVal('line_access_token');

    if (!channelSecret || !accessToken) {
      return Response.json({ error: 'LINE OA not configured' }, { status: 400 });
    }

    // Verify LINE signature
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

    const events = payload.events || [];

    for (const event of events) {
      // Auto-capture Group ID
      if (event.source?.type === 'group' && event.source?.groupId) {
        const existingGroupConfig = configs.find(c => c.key === 'line_group_id');
        const currentGroupId = existingGroupConfig?.value || '';
        if (currentGroupId !== event.source.groupId) {
          if (existingGroupConfig) {
            await base44.asServiceRole.entities.AppConfig.update(existingGroupConfig.id, { value: event.source.groupId });
          } else {
            await base44.asServiceRole.entities.AppConfig.create({ key: 'line_group_id', value: event.source.groupId, description: 'LINE Group ID (auto-captured)' });
          }
          console.log(`Auto-captured LINE Group ID: ${event.source.groupId}`);
        }
      }

      if (event.type === 'message') {
        const userId = event.source?.userId;
        const msg = event.message;
        const messageType = msg?.type || 'text';

        // Fetch user profile
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

        let content = '';
        let fileUrl = '';

        if (messageType === 'text') {
          content = msg.text || '';
        } else if (messageType === 'sticker') {
          // Build sticker image URL from LINE sticker CDN
          const stickerId = msg.stickerId;
          const packageId = msg.packageId;
          content = `[Sticker]`;
          if (stickerId) {
            fileUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker.png`;
          }
        } else if (messageType === 'image' || messageType === 'video' || messageType === 'audio' || messageType === 'file') {
          // Download content from LINE API and upload to Base44
          content = messageType === 'image' ? '[รูปภาพ]'
            : messageType === 'video' ? '[วิดีโอ]'
            : messageType === 'audio' ? '[เสียง]'
            : `[ไฟล์: ${msg.fileName || 'file'}]`;

          try {
            const contentRes = await fetch(`https://api-data.line.me/v2/bot/message/${msg.id}/content`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (contentRes.ok) {
              const contentType = contentRes.headers.get('content-type') || 'application/octet-stream';
              const blob = await contentRes.blob();

              // Determine file extension
              let ext = 'bin';
              if (messageType === 'image') ext = 'jpg';
              else if (messageType === 'video') ext = 'mp4';
              else if (messageType === 'audio') ext = 'm4a';
              else if (msg.fileName) ext = msg.fileName.split('.').pop() || 'bin';

              const fileName = `line_${messageType}_${msg.id}.${ext}`;
              const file = new File([blob], fileName, { type: contentType });

              const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
              fileUrl = uploadResult.file_url || '';
              console.log(`Uploaded LINE ${messageType} → ${fileUrl}`);
            } else {
              console.warn(`Failed to download LINE content: ${contentRes.status}`);
            }
          } catch (e) {
            console.warn(`Failed to process LINE ${messageType}:`, e.message);
          }
        } else {
          content = `[${messageType}]`;
        }

        await base44.asServiceRole.entities.LineMessage.create({
          line_user_id: userId,
          display_name: displayName,
          profile_image: profileImage,
          message_type: messageType === 'audio' || messageType === 'video' ? 'file' : (messageType === 'sticker' ? 'sticker' : messageType),
          content: content,
          direction: 'incoming',
          file_url: fileUrl || undefined,
          is_read: false,
        });

        console.log(`Saved incoming ${messageType} from ${displayName}: ${content}`);
      }
    }

    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('LINE webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});