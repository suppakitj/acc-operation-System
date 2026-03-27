import React, { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PinnedMessages({ messages, pinnedIds, onUnpin, onScrollTo }) {
  const [expanded, setExpanded] = useState(false);

  const pinned = messages.filter(m => pinnedIds.includes(m.id));
  if (pinned.length === 0) return null;

  const displayed = expanded ? pinned : pinned.slice(0, 1);

  return (
    <div className="border-b bg-amber-50/50">
      {displayed.map(msg => (
        <div
          key={msg.id}
          className="flex items-center gap-2.5 px-4 py-2 hover:bg-amber-100/40 cursor-pointer transition-colors"
          onClick={() => onScrollTo?.(msg.id)}
        >
          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Pin className="w-3 h-3 text-amber-600 fill-amber-600 rotate-45" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{msg.content || (msg.message_type === 'image' ? '📷 รูปภาพ' : '📎 ไฟล์')}</p>
            <p className="text-[10px] text-muted-foreground truncate">{msg.sender_name || msg.display_name || ''}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100"
            onClick={e => { e.stopPropagation(); onUnpin(msg); }}
            title="เลิกปักหมุด"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </Button>
          {pinned.length > 1 && msg === displayed[displayed.length - 1] && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              title={expanded ? 'ย่อ' : `ดูทั้งหมด (${pinned.length})`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}