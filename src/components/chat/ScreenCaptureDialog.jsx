import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send, Clipboard, Image as ImageIcon, X } from 'lucide-react';

export default function ScreenCaptureDialog({ open, onOpenChange, onSend, sending }) {
  const [imageData, setImageData] = useState(null);
  const pasteAreaRef = useRef(null);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => setImageData({ dataUrl: ev.target.result, file });
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      setImageData(null);
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
    }
  }, [open, handlePaste]);

  const handleSend = () => {
    if (imageData?.file) {
      onSend(imageData.file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clipboard className="w-4 h-4" />
            Capture & ส่งรูปภาพ
          </DialogTitle>
        </DialogHeader>

        <div
          ref={pasteAreaRef}
          className="border-2 border-dashed rounded-lg p-6 text-center min-h-[200px] flex flex-col items-center justify-center gap-3 focus:outline-none focus:border-primary transition-colors"
          tabIndex={0}
        >
          {imageData ? (
            <div className="relative w-full">
              <img
                src={imageData.dataUrl}
                alt="Screenshot"
                className="max-h-[300px] mx-auto rounded-lg object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setImageData(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">กด Ctrl+V (หรือ ⌘+V) เพื่อวางรูปภาพ</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Capture หน้าจอด้วย PrtSc / Snipping Tool แล้ววางที่นี่</p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!imageData || sending}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'กำลังส่ง...' : 'ส่งรูปภาพ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}