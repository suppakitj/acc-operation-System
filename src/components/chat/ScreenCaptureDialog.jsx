import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send, MonitorUp, Clipboard, X } from 'lucide-react';

export default function ScreenCaptureDialog({ open, onOpenChange, onSend, sending }) {
  const [imageData, setImageData] = useState(null);

  // Listen for paste events
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

  // Use getDisplayMedia to capture screen directly
  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop(); // stop sharing immediately after capture

      // Draw bitmap to canvas -> blob -> file
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        const dataUrl = canvas.toDataURL('image/png');
        setImageData({ dataUrl, file });
      }, 'image/png');
    } catch (err) {
      // User cancelled the screen picker — do nothing
      if (err.name !== 'NotAllowedError') {
        console.error('Capture failed:', err);
      }
    }
  };

  const handleSend = () => {
    if (imageData?.file) onSend(imageData.file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MonitorUp className="w-4 h-4" />
            Capture & ส่งรูปภาพ
          </DialogTitle>
        </DialogHeader>

        <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[200px] flex flex-col items-center justify-center gap-3">
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
              <Button onClick={handleCapture} variant="outline" className="gap-2">
                <MonitorUp className="w-4 h-4" />
                Capture หน้าจอ
              </Button>
              <p className="text-xs text-muted-foreground">
                เลือกหน้าจอ/หน้าต่างที่ต้องการ capture
              </p>
              <div className="flex items-center gap-2 text-muted-foreground/50 text-xs">
                <div className="h-px flex-1 bg-border" />
                หรือ
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clipboard className="w-3.5 h-3.5" />
                วางรูปจาก clipboard (Ctrl+V)
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button size="sm" onClick={handleSend} disabled={!imageData || sending} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            {sending ? 'กำลังส่ง...' : 'ส่งรูปภาพ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}