import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Image as ImageIcon, ClipboardPlus, MoreHorizontal, Reply, Copy, Pin } from 'lucide-react';
import { parseUTCDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ChatBubble({ message, onCreateTask, onReply, onPin, pinnedIds = [] }) {
  const isOutgoing = message.direction === 'outgoing';
  const [imgError, setImgError] = useState(false);
  const isPinned = pinnedIds.includes(message.id);

  const bubbleClass = isOutgoing
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted';

  const timeClass = isOutgoing
    ? 'text-primary-foreground/60'
    : 'text-muted-foreground';

  const handleCopy = () => {
    const text = message.content || '';
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('คัดลอกข้อความแล้ว');
    }
  };

  const renderContent = () => {
    const type = message.message_type;

    if (type === 'sticker' && message.file_url) {
      return <img src={message.file_url} alt="sticker" className="w-24 h-24 object-contain" onError={() => setImgError(true)} />;
    }

    if (type === 'image' && message.file_url && !imgError) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer">
          <img src={message.file_url} alt="รูปภาพ" className="max-w-[240px] max-h-[240px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" onError={() => setImgError(true)} />
        </a>
      );
    }

    if (type === 'file' && message.file_url) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isOutgoing ? 'border-primary-foreground/20 hover:bg-primary-foreground/10' : 'border-border hover:bg-background'}`}>
          <FileText className="w-5 h-5 shrink-0" />
          <span className="text-sm truncate max-w-[180px]">{message.content || 'ไฟล์'}</span>
          <Download className="w-4 h-4 shrink-0 opacity-60" />
        </a>
      );
    }

    if ((type === 'sticker' || type === 'image') && (!message.file_url || imgError)) {
      return (
        <div className="flex items-center gap-2 opacity-70">
          <ImageIcon className="w-4 h-4" />
          <span className="text-sm italic">{message.content || (type === 'sticker' ? '[Sticker]' : '[รูปภาพ]')}</span>
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
  };

  // Reply quote display
  const renderReplyQuote = () => {
    if (!message._replyTo) return null;
    return (
      <div className={`text-[11px] px-2 py-1 mb-1 rounded border-l-2 ${isOutgoing ? 'border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/80' : 'border-primary/40 bg-primary/5 text-foreground/70'}`}>
        <span className="font-medium">{message._replyTo.sender || ''}</span>
        <p className="truncate">{message._replyTo.content || ''}</p>
      </div>
    );
  };

  const isSticker = message.message_type === 'sticker' && message.file_url && !imgError;
  const showSenderName = !isOutgoing && message.chat_type === 'group' && message.sender_name;

  return (
    <div className={`flex gap-1 group ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      {/* Action menu — shows on left for outgoing, right for incoming */}
      {isOutgoing && (
        <MessageActions
          message={message}
          onReply={onReply}
          onCopy={handleCopy}
          onPin={onPin}
          onCreateTask={onCreateTask}
          isPinned={isPinned}
        />
      )}

      <div className="relative">
        {isPinned && (
          <div className="absolute -top-2 right-2 z-10">
            <Pin className="w-3 h-3 text-amber-500 fill-amber-500 rotate-45" />
          </div>
        )}
        <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2 ${isSticker ? '' : bubbleClass}`}>
          {showSenderName && <p className="text-[11px] font-medium text-primary mb-1">{message.sender_name}</p>}
          {renderReplyQuote()}
          {renderContent()}
          {isOutgoing && message.replied_by && (
            <p className="text-[10px] font-medium opacity-70 text-right mb-0.5">
              {message.replied_by.includes('@') ? message.replied_by.split('@')[0] : message.replied_by}
            </p>
          )}
          <div className={`flex items-center gap-1 mt-1 ${isSticker ? 'text-muted-foreground' : timeClass}`}>
            <span className="text-[10px]">{message.created_date && format(parseUTCDate(message.created_date), 'HH:mm')}</span>
          </div>
        </div>
      </div>

      {/* Action menu for incoming */}
      {!isOutgoing && (
        <MessageActions
          message={message}
          onReply={onReply}
          onCopy={handleCopy}
          onPin={onPin}
          onCreateTask={onCreateTask}
          isPinned={isPinned}
        />
      )}
    </div>
  );
}

function MessageActions({ message, onReply, onCopy, onPin, onCreateTask, isPinned }) {
  const isSticker = message.message_type === 'sticker';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        {onReply && (
          <DropdownMenuItem onClick={() => onReply(message)} className="gap-2 text-xs">
            <Reply className="w-3.5 h-3.5" /> ตอบกลับ
          </DropdownMenuItem>
        )}
        {!isSticker && message.content && (
          <DropdownMenuItem onClick={onCopy} className="gap-2 text-xs">
            <Copy className="w-3.5 h-3.5" /> คัดลอกข้อความ
          </DropdownMenuItem>
        )}
        {onPin && (
          <DropdownMenuItem onClick={() => onPin(message)} className="gap-2 text-xs">
            <Pin className="w-3.5 h-3.5" /> {isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
          </DropdownMenuItem>
        )}
        {onCreateTask && message.direction === 'incoming' && !isSticker && (
          <DropdownMenuItem onClick={() => onCreateTask(message)} className="gap-2 text-xs">
            <ClipboardPlus className="w-3.5 h-3.5" /> สร้างงาน
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}