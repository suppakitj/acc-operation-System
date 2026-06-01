import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch ALL messages in batches, collecting only the latest per line_user_id
    const BATCH = 50;
    const chats = {}; // line_user_id -> chat summary
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      let batch;
      try {
        batch = await base44.asServiceRole.entities.LineMessage.filter(
          {},
          '-created_date',
          BATCH,
          offset
        );
      } catch (e) {
        console.error(`Batch fetch error at offset ${offset}:`, e.message);
        break;
      }

      if (typeof batch === 'string') {
        try { batch = JSON.parse(batch); } catch { batch = []; }
      }
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const m of batch) {
        const key = m.line_user_id || m.customer_name || 'unknown';
        if (!chats[key]) {
          chats[key] = {
            id: key,
            name: m.display_name || m.customer_name || '?',
            image: m.profile_image || '',
            chatType: m.chat_type || 'user',
            lastDate: m.created_date,
            lastContent: m.content || '',
            lastMessageType: m.message_type || 'text',
            lastDirection: m.direction || 'incoming',
            unread: 0,
            totalMessages: 0,
          };
        }
        const chat = chats[key];
        chat.totalMessages++;

        // Update latest message info (messages are sorted -created_date, so first one per key is latest)
        if ((m.created_date || '') > (chat.lastDate || '')) {
          chat.lastDate = m.created_date;
          chat.lastContent = m.content || '';
          chat.lastMessageType = m.message_type || 'text';
          chat.lastDirection = m.direction || 'incoming';
        }

        // Update name/image from most recent message
        if (m.display_name && (m.created_date || '') >= (chat.lastDate || '')) {
          chat.name = m.display_name;
        }
        if (m.profile_image && !chat.image) {
          chat.image = m.profile_image;
        }

        // Count unread incoming messages
        if (!m.is_read && m.direction === 'incoming') {
          chat.unread++;
        }
      }

      offset += batch.length;
      if (batch.length < BATCH) hasMore = false;
    }

    const chatList = Object.values(chats).sort((a, b) => {
      if (a.unread > 0 && b.unread === 0) return -1;
      if (a.unread === 0 && b.unread > 0) return 1;
      return (b.lastDate || '').localeCompare(a.lastDate || '');
    });

    return Response.json({ chats: chatList, total: chatList.length });
  } catch (error) {
    console.error('listLineChats error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});