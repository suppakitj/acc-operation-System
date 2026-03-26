import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send, MonitorUp, Clipboard, X, Crop, RotateCcw, Pencil } from 'lucide-react';
import ImageEditor from './ImageEditor';

function ImageCropper({ src, onCrop, onReset }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [rect, setRect] = useState(null);
  const [startPos, setStartPos] = useState(null);

  const getPos = (e) => {
    const bounds = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(clientX - bounds.left, bounds.width)),
      y: Math.max(0, Math.min(clientY - bounds.top, bounds.height)),
    };
  };

  const handleDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    setStartPos(pos);
    setRect(null);
    setDrawing(true);
  };

  const handleMove = (e) => {
    if (!drawing || !startPos) return;
    e.preventDefault();
    const pos = getPos(e);
    setRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    });
  };

  const handleUp = () => {
    setDrawing(false);
  };

  const handleCrop = () => {
    if (!rect || rect.w < 10 || rect.h < 10) return;
    const container = containerRef.current;
    const img = imgRef.current;
    const scaleX = img.naturalWidth / container.offsetWidth;
    const scaleY = img.naturalHeight / container.offsetHeight;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rect.w * scaleX);
    canvas.height = Math.round(rect.h * scaleY);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      Math.round(rect.x * scaleX), Math.round(rect.y * scaleY),
      canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height
    );

    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `crop-${Date.now()}.png`, { type: 'image/png' });
      onCrop({ dataUrl, file });
    }, 'image/png');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Crop className="w-3 h-3" /> ลากเลือกบริเวณที่ต้องการ crop
      </div>
      <div
        ref={containerRef}
        className="relative select-none cursor-crosshair rounded-lg overflow-hidden"
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={() => setDrawing(false)}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
      >
        <img ref={imgRef} src={src} alt="capture" className="w-full block" draggable={false} />
        {/* Dim overlay with cutout */}
        {rect && rect.w > 2 && rect.h > 2 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="crop-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
            <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h}
              fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" />
          </svg>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="w-3 h-3" /> ใหม่
        </Button>
        <Button size="sm" onClick={handleCrop} disabled={!rect || rect.w < 10 || rect.h < 10} className="gap-1.5">
          <Crop className="w-3 h-3" /> Crop
        </Button>
      </div>
    </div>
  );
}

export default function ScreenCaptureDialog({ open, onOpenChange, onSend, sending }) {
  const [imageData, setImageData] = useState(null); // final image to send
  const [rawCapture, setRawCapture] = useState(null); // full screenshot for cropping
  const [mode, setMode] = useState('idle'); // idle | crop | edit | ready

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImageData({ dataUrl: ev.target.result, file });
          setMode('edit');
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      setImageData(null);
      setRawCapture(null);
      setMode('idle');
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
    }
  }, [open, handlePaste]);

  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
      });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => { video.play(); setTimeout(resolve, 200); };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      track.stop();
      video.srcObject = null;

      const dataUrl = canvas.toDataURL('image/png');
      canvas.toBlob((blob) => {
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        setRawCapture(dataUrl);
        setImageData({ dataUrl, file });
        setMode('crop'); // go to crop mode
      }, 'image/png');
    } catch (err) {
      if (err.name !== 'NotAllowedError') console.error('Capture failed:', err);
    }
  };

  const handleCropDone = (cropped) => {
    setImageData(cropped);
    setMode('edit');
  };

  const handleEditDone = (edited) => {
    setImageData(edited);
    setMode('ready');
  };

  const handleSend = () => {
    if (imageData?.file) onSend(imageData.file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={mode === 'edit' ? 'max-w-2xl' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MonitorUp className="w-4 h-4" />
            Capture หน้าจอ
          </DialogTitle>
        </DialogHeader>

        {mode === 'idle' && (
          <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[150px] flex flex-col items-center justify-center gap-3">
            <Button onClick={handleCapture} className="gap-2">
              <MonitorUp className="w-4 h-4" /> Capture หน้าจอ
            </Button>
            <p className="text-xs text-muted-foreground">กดแล้วเลือกหน้าจอ → crop เลือกส่วนที่ต้องการ → ส่ง</p>
            <div className="flex items-center gap-2 text-muted-foreground/50 text-xs w-full">
              <div className="h-px flex-1 bg-border" /> หรือ วางรูป Ctrl+V <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        {mode === 'crop' && rawCapture && (
          <ImageCropper
            src={rawCapture}
            onCrop={handleCropDone}
            onReset={() => { setRawCapture(null); setImageData(null); setMode('idle'); }}
          />
        )}

        {mode === 'edit' && imageData && (
          <ImageEditor
            src={imageData.dataUrl}
            onDone={handleEditDone}
          />
        )}

        {mode === 'ready' && imageData && (
          <div className="space-y-2">
            <div className="relative">
              <img src={imageData.dataUrl} alt="Screenshot" className="max-h-[300px] mx-auto rounded-lg object-contain" />
              <Button variant="ghost" size="icon"
                className="absolute top-1 right-1 h-7 w-7 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => { setImageData(null); setRawCapture(null); setMode('idle'); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {rawCapture && (
                <Button variant="outline" size="sm" onClick={() => setMode('crop')} className="gap-1.5">
                  <Crop className="w-3 h-3" /> Crop ใหม่
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setMode('edit')} className="gap-1.5">
                <Pencil className="w-3 h-3" /> แก้ไขรูป
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          {mode === 'crop' && (
            <Button size="sm" onClick={() => { setMode('edit'); }} disabled={!imageData} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              ข้าม crop → แก้ไข
            </Button>
          )}
          {mode === 'ready' && (
            <Button size="sm" onClick={handleSend} disabled={!imageData || sending} className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              {sending ? 'กำลังส่ง...' : 'ส่ง'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}