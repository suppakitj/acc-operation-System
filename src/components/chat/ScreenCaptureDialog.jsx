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

  // Simple capture — grab screen, get image immediately
  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        preferCurrentTab: false,
      });
      const track = stream.getVideoTracks()[0];

      // Use video element to grab a frame (more compatible than ImageCapture)
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          // Wait a moment for the first frame to render
          setTimeout(resolve, 200);
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Stop sharing immediately
      track.stop();
      video.srcObject = null;

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        const dataUrl = canvas.toDataURL('image/png');
        setImageData({ dataUrl, file });
      }, 'image/png');
    } catch (err) {
      // User cancelled — do nothing
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
            Capture หน้าจอ
          </DialogTitle>
        </DialogHeader>

        <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[180px] flex flex-col items-center justify-center gap-3">
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
              <Button onClick={handleCapture} className="gap-2">
                <MonitorUp className="w-4 h-4" />
                Capture หน้าจอ
              </Button>
              <p className="text-xs text-muted-foreground">กดแล้วเลือกหน้าจอ จะได้รูปทันที</p>
              <div className="flex items-center gap-2 text-muted-foreground/50 text-xs w-full">
                <div className="h-px flex-1 bg-border" />
                หรือ วางรูป Ctrl+V
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button size="sm" onClick={handleSend} disabled={!imageData || sending} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            {sending ? 'กำลังส่ง...' : 'ส่ง'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}