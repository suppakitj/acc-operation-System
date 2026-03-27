import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Image as ImageIcon, ClipboardPlus, MoreHorizontal, Reply, Copy, Pin, Check, CheckCheck } from 'lucide-react';
import { parseUTCDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { replaceLineEmojis } from './lineEmojiMap';

export default function ChatBubble({ message, onCreateTask, onReply, onPin, pinnedIds = [], onQuoteClick }) {
  const isOutgoing = message.direction === 'outgoing';
  const [imgError, setImgError] = useState(false);
  const isPinned = pinnedIds.includes(message.id);

  const handleCopy = () => {
    const text = message.content || '';
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('คัดลอกข้อความแล้ว');
    }
  };

  // Check if content starts with reply prefix
  const parseReplyContent = () => {
    const text = message.content || '';
    if (!text.startsWith('↩️')) return { quote: null, body: text };
    const parts = text.split('\n\n');
    if (parts.length >= 2) {
      const quoteLine = parts[0].replace('↩️ ', '');
      const body = parts.slice(1).join('\n\n');
      return { quote: quoteLine, body };
    }
    return { quote: null, body: text };
  };

  const { quote: replyQuote, body: messageBody } = parseReplyContent();

  const handleQuoteClick = () => {
    if (message.reply_to_id && onQuoteClick) onQuoteClick(message.reply_to_id);
  };

  const renderReplyQuote = () => {
    const clickable = !!(message.reply_to_id && onQuoteClick);
    const clickClass = clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

    if (message._replyTo) {
      return (
        <div onClick={clickable ? handleQuoteClick : undefined}
          className={`text-[11px] px-2.5 py-1.5 mb-2 rounded-lg ${clickClass} ${isOutgoing ? 'bg-white/15 border-l-2 border-white/50' : 'bg-primary/5 border-l-2 border-primary/30'}`}>
          <span className={`font-semibold ${isOutgoing ? 'text-white/85' : 'text-primary'}`}>{message._replyTo.sender || ''}</span>
          <p className={`truncate ${isOutgoing ? 'text-white/60' : 'text-muted-foreground'}`}>{message._replyTo.content || ''}</p>
        </div>
      );
    }
    if (replyQuote) {
      return (
        <div onClick={clickable ? handleQuoteClick : undefined}
          className={`text-[11px] px-2.5 py-1.5 mb-2 rounded-lg ${clickClass} ${isOutgoing ? 'bg-white/15 border-l-2 border-white/50' : 'bg-primary/5 border-l-2 border-primary/30'}`}>
          <p className={isOutgoing ? 'text-white/70' : 'text-muted-foreground'}>{replyQuote}</p>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    const type = message.message_type;

    if (type === 'sticker' && message.file_url) {
      return <img src={message.file_url} alt="sticker" className="w-28 h-28 object-contain" onError={() => setImgError(true)} />;
    }

    if (type === 'image' && message.file_url && !imgError) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer">
          <img src={message.file_url} alt="รูปภาพ" className="max-w-[260px] max-h-[260px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" onError={() => setImgError(true)} />
        </a>
      );
    }

    if (type === 'file' && message.file_url) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${isOutgoing ? 'bg-white/10 hover:bg-white/20' : 'bg-muted hover:bg-muted/80'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOutgoing ? 'bg-white/20' : 'bg-primary/10'}`}>
            <FileText className={`w-4 h-4 ${isOutgoing ? 'text-white' : 'text-primary'}`} />
          </div>
          <span className="text-sm truncate max-w-[180px] font-medium">{message.content || 'ไฟล์'}</span>
          <Download className="w-4 h-4 shrink-0 opacity-50" />
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

    return <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{replaceLineEmojis(replyQuote ? messageBody : message.content)}</p>;
  };

  const isSticker = message.message_type === 'sticker' && message.file_url && !imgError;
  const showSenderName = !isOutgoing && message.chat_type === 'group' && message.sender_name;

  return (
    <div className={`flex gap-1.5 group py-0.5 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      {isOutgoing && (
        <MessageActions message={message} onReply={onReply} onCopy={handleCopy} onPin={onPin} onCreateTask={onCreateTask} isPinned={isPinned} />
      )}

      <div className="relative max-w-[75%] md:max-w-[65%]">
        {isPinned && (
          <div className="absolute -top-1.5 right-3 z-10">
            <div className="bg-amber-100 rounded-full p-0.5">
              <Pin className="w-2.5 h-2.5 text-amber-600 fill-amber-600 rotate-45" />
            </div>
          </div>
        )}
        <div className={`rounded-2xl px-3.5 py-2.5 ${isSticker ? '' : isOutgoing
          ? 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-sm'
          : 'bg-white border border-border/60 shadow-sm'}`}
        >
          {showSenderName && (
            <p className="text-[11px] font-semibold text-primary mb-1">{message.sender_name}</p>
          )}
          {renderReplyQuote()}
          {renderContent()}
          <div className={`flex items-center justify-end gap-1.5 mt-1 ${isSticker ? 'text-muted-foreground' : isOutgoing ? 'text-white/50' : 'text-muted-foreground/60'}`}>
            {isOutgoing && message.replied_by && (
              <span className="text-[10px] font-medium opacity-80">
                {message.replied_by.includes('@') ? message.replied_by.split('@')[0] : message.replied_by}
              </span>
            )}
            <span className="text-[10px]">{message.created_date && format(parseUTCDate(message.created_date), 'HH:mm')}</span>
            {isOutgoing && <CheckCheck className="w-3 h-3" />}
          </div>
        </div>
      </div>

      {!isOutgoing && (
        <MessageActions message={message} onReply={onReply} onCopy={handleCopy} onPin={onPin} onCreateTask={onCreateTask} isPinned={isPinned} />
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
          variant="ghost" size="icon"
          className="h-7 w-7 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-full hover:bg-muted"
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[150px] rounded-xl">
        {onReply && (
          <DropdownMenuItem onClick={() => onReply(message)} className="gap-2.5 text-xs py-2">
            <Reply className="w-3.5 h-3.5" /> ตอบกลับ
          </DropdownMenuItem>
        )}
        {!isSticker && message.content && (
          <DropdownMenuItem onClick={onCopy} className="gap-2.5 text-xs py-2">
            <Copy className="w-3.5 h-3.5" /> คัดลอกข้อความ
          </DropdownMenuItem>
        )}
        {onPin && (
          <DropdownMenuItem onClick={() => onPin(message)} className="gap-2.5 text-xs py-2">
            <Pin className="w-3.5 h-3.5" /> {isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
          </DropdownMenuItem>
        )}
        {onCreateTask && message.direction === 'incoming' && !isSticker && (
          <DropdownMenuItem onClick={() => onCreateTask(message)} className="gap-2.5 text-xs py-2">
            <ClipboardPlus className="w-3.5 h-3.5" /> สร้างงาน
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}