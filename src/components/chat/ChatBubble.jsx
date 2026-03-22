import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Image as ImageIcon, ClipboardPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatBubble({ message, onCreateTask }) {
  const isOutgoing = message.direction === 'outgoing';
  const [imgError, setImgError] = useState(false);

  const bubbleClass = isOutgoing
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted';

  const timeClass = isOutgoing
    ? 'text-primary-foreground/60'
    : 'text-muted-foreground';

  const renderContent = () => {
    const type = message.message_type;

    // Sticker
    if (type === 'sticker' && message.file_url) {
      return (
        <img
          src={message.file_url}
          alt="sticker"
          className="w-24 h-24 object-contain"
          onError={() => setImgError(true)}
        />
      );
    }

    // Image
    if (type === 'image' && message.file_url && !imgError) {
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer">
          <img
            src={message.file_url}
            alt="รูปภาพ"
            className="max-w-[240px] max-h-[240px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onError={() => setImgError(true)}
          />
        </a>
      );
    }

    // File (video, audio, other files)
    if (type === 'file' && message.file_url) {
      return (
        <a
          href={message.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            isOutgoing
              ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
              : 'border-border hover:bg-background'
          }`}
        >
          <FileText className="w-5 h-5 shrink-0" />
          <span className="text-sm truncate max-w-[180px]">{message.content || 'ไฟล์'}</span>
          <Download className="w-4 h-4 shrink-0 opacity-60" />
        </a>
      );
    }

    // Fallback for sticker/image without file_url, or image load error
    if ((type === 'sticker' || type === 'image') && (!message.file_url || imgError)) {
      return (
        <div className="flex items-center gap-2 opacity-70">
          <ImageIcon className="w-4 h-4" />
          <span className="text-sm italic">{message.content || (type === 'sticker' ? '[Sticker]' : '[รูปภาพ]')}</span>
        </div>
      );
    }

    // Default: text
    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
  };

  // For sticker, use transparent background
  const isSticker = message.message_type === 'sticker' && message.file_url && !imgError;
  const showSenderName = !isOutgoing && message.chat_type === 'group' && message.sender_name;

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2 ${isSticker ? '' : bubbleClass}`}>
        {showSenderName && (
          <p className="text-[11px] font-medium text-primary mb-1">{message.sender_name}</p>
        )}
        {renderContent()}
        <div className={`flex items-center gap-1 mt-1 ${isSticker ? 'text-muted-foreground' : timeClass}`}>
          <span className="text-[10px]">
            {message.created_date && format(new Date(message.created_date), 'HH:mm')}
          </span>
          {isOutgoing && message.replied_by && (
            <span className="text-[10px]">· {message.replied_by.split('@')[0]}</span>
          )}
        </div>
      </div>
    </div>
  );
}