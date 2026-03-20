import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createHmac } from 'node:crypto';

Deno.serve(async (req) => {
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
      // Auto-capture Group ID in AppConfig
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
        const sourceType = event.source?.type; // 'user', 'group', 'room'
        const userId = event.source?.userId;
        const groupId = event.source?.groupId;
        const roomId = event.source?.roomId;
        const msg = event.message;
        const messageType = msg?.type || 'text';

        // Determine chat key: group/room ID for group chats, userId for 1-on-1
        const isGroup = sourceType === 'group' || sourceType === 'room';
        const chatKey = isGroup ? (groupId || roomId) : userId;
        const chatType = isGroup ? 'group' : 'user';

        // Fetch sender profile (the person who sent the message)
        let senderName = userId || 'Unknown';
        let senderImage = '';
        if (userId) {
          try {
            let profileUrl;
            if (sourceType === 'group' && groupId) {
              profileUrl = `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`;
            } else if (sourceType === 'room' && roomId) {
              profileUrl = `https://api.line.me/v2/bot/room/${roomId}/member/${userId}`;
            } else {
              profileUrl = `https://api.line.me/v2/bot/profile/${userId}`;
            }
            const profileRes = await fetch(profileUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              senderName = profile.displayName || userId;
              senderImage = profile.pictureUrl || '';
            }
          } catch (e) {
            console.warn('Failed to fetch LINE profile:', e.message);
          }
        }

        // Fetch group/room name for display_name
        let chatDisplayName = senderName;
        let chatImage = senderImage;
        if (isGroup) {
          try {
            const groupUrl = sourceType === 'group'
              ? `https://api.line.me/v2/bot/group/${groupId}/summary`
              : `https://api.line.me/v2/bot/room/${roomId}/member/${userId}`;
            const groupRes = await fetch(groupUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (groupRes.ok) {
              const groupData = await groupRes.json();
              chatDisplayName = groupData.groupName || `กลุ่ม ${(groupId || roomId).substring(0, 8)}`;
              chatImage = groupData.pictureUrl || '';
            }
          } catch (e) {
            chatDisplayName = `กลุ่ม ${(groupId || roomId).substring(0, 8)}`;
            console.warn('Failed to fetch group summary:', e.message);
          }
        }

        // Process message content
        let content = '';
        let fileUrl = '';

        if (messageType === 'text') {
          content = msg.text || '';
        } else if (messageType === 'sticker') {
          const stickerId = msg.stickerId;
          content = '[Sticker]';
          if (stickerId) {
            fileUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker.png`;
          }
        } else if (messageType === 'image' || messageType === 'video' || messageType === 'audio' || messageType === 'file') {
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
            }
          } catch (e) {
            console.warn(`Failed to process LINE ${messageType}:`, e.message);
          }
        } else {
          content = `[${messageType}]`;
        }

        const mappedType = (messageType === 'audio' || messageType === 'video') ? 'file'
          : (messageType === 'sticker') ? 'sticker'
          : (messageType === 'image') ? 'image'
          : (messageType === 'file') ? 'file'
          : 'text';

        await base44.asServiceRole.entities.LineMessage.create({
          line_user_id: chatKey,
          display_name: chatDisplayName,
          profile_image: chatImage,
          sender_name: isGroup ? senderName : undefined,
          message_type: mappedType,
          content: content,
          direction: 'incoming',
          file_url: fileUrl || undefined,
          is_read: false,
          chat_type: chatType,
        });

        console.log(`Saved incoming ${messageType} from ${senderName} in ${chatType} (${chatKey}): ${content}`);

        // Update display_name and profile_image on older messages in the same chat
        if (chatDisplayName || chatImage) {
          try {
            const oldMsgs = await base44.asServiceRole.entities.LineMessage.filter(
              { line_user_id: chatKey },
              '-created_date',
              50
            );
            for (const old of oldMsgs) {
              if (old.display_name !== chatDisplayName || old.profile_image !== chatImage) {
                await base44.asServiceRole.entities.LineMessage.update(old.id, {
                  display_name: chatDisplayName,
                  profile_image: chatImage,
                });
              }
            }
          } catch (e) {
            console.warn('Failed to update old messages display info:', e.message);
          }
        }

        // Auto-save files to Google Drive (images and documents only, skip video/audio)
        if (fileUrl && (messageType === 'image' || messageType === 'file')) {
          try {
            let ext = 'bin';
            if (messageType === 'image') ext = 'jpg';
            else if (messageType === 'video') ext = 'mp4';
            else if (messageType === 'audio') ext = 'm4a';
            else if (msg.fileName) ext = msg.fileName.split('.').pop() || 'bin';

            const driveFileName = msg.fileName || `line_${messageType}_${msg.id}.${ext}`;
            const driveContentType = messageType === 'image' ? 'image/jpeg'
              : messageType === 'video' ? 'video/mp4'
              : messageType === 'audio' ? 'audio/m4a'
              : 'application/octet-stream';

            const driveRes = await base44.asServiceRole.functions.invoke('saveLineFileToDrive', {
              file_url: fileUrl,
              file_name: driveFileName,
              content_type: driveContentType,
              chat_display_name: chatDisplayName,
              message_type: messageType,
            });
            console.log(`Auto-saved to Google Drive: ${driveRes?.folder_path || 'done'}`);
          } catch (driveErr) {
            console.warn('Auto-save to Drive failed (non-blocking):', driveErr.message);
          }
        }
      }
    }

    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('LINE webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});