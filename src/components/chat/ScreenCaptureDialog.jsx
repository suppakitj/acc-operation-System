import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send, MonitorUp, Clipboard, X, Crop } from 'lucide-react';
import ScreenCropOverlay from './ScreenCropOverlay';

export default function ScreenCaptureDialog({ open, onOpenChange, onSend, sending }) {
  const [imageData, setImageData] = useState(null);
  const [fullScreenshot, setFullScreenshot] = useState(null); // full capture for cropping
  const [showCropper, setShowCropper] = useState(false);

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
      setFullScreenshot(null);
      setShowCropper(false);
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
    }
  }, [open, handlePaste]);

  // Capture screen -> show crop overlay
  const handleCapture = async () => {
    try {
      // Temporarily hide the dialog
      onOpenChange(false);
      
      await new Promise(r => setTimeout(r, 300)); // wait for dialog to close
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      
      // Wait a frame for the stream to stabilize
      await new Promise(r => setTimeout(r, 100));
      
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      setFullScreenshot(dataUrl);
      setShowCropper(true);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('Capture failed:', err);
      }
      // Re-open dialog if cancelled
      onOpenChange(true);
    }
  };

  const handleCropDone = (cropped) => {
    setShowCropper(false);
    setFullScreenshot(null);
    setImageData(cropped);
    onOpenChange(true); // re-open dialog with cropped image
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setFullScreenshot(null);
    onOpenChange(true);
  };

  const handleSend = () => {
    if (imageData?.file) onSend(imageData.file);
  };

  // Show crop overlay (outside dialog)
  if (showCropper && fullScreenshot) {
    return (
      <ScreenCropOverlay
        imageSrc={fullScreenshot}
        onCrop={handleCropDone}
        onCancel={handleCropCancel}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crop className="w-4 h-4" />
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
                Capture หน้าจอ (ลากเลือกได้)
              </Button>
              <p className="text-xs text-muted-foreground">
                จะเปิดให้เลือกหน้าจอ แล้วลากเลือกบริเวณที่ต้องการ
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