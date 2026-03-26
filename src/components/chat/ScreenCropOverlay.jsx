import React, { useState, useRef, useEffect } from 'react';

export default function ScreenCropOverlay({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(new Image());

  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Fit image to screen
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.floor(img.width * scale);
      const h = Math.floor(img.height * scale);
      canvas.width = w;
      canvas.height = h;
      setImgSize({ w, h, scale });
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleStart = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    setStart(pos);
    setEnd(pos);
    setDrawing(true);
  };

  const handleMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setEnd(pos);
    redraw(start, pos);
  };

  const handleEnd = (e) => {
    if (!drawing) return;
    e.preventDefault();
    setDrawing(false);
    const pos = end || getPos(e);
    if (start && pos) {
      crop(start, pos);
    }
  };

  const redraw = (s, e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear selection area
    const x = Math.min(s.x, e.x);
    const y = Math.min(s.y, e.y);
    const w = Math.abs(e.x - s.x);
    const h = Math.abs(e.y - s.y);
    ctx.clearRect(x, y, w, h);
    ctx.drawImage(imgRef.current, x / canvas.width * imgRef.current.width, y / canvas.height * imgRef.current.height, w / canvas.width * imgRef.current.width, h / canvas.height * imgRef.current.height, x, y, w, h);

    // Selection border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  };

  const crop = (s, e) => {
    const x = Math.min(s.x, e.x);
    const y = Math.min(s.y, e.y);
    const w = Math.abs(e.x - s.x);
    const h = Math.abs(e.y - s.y);
    if (w < 10 || h < 10) return; // too small

    const { scale } = imgSize;
    const sx = x / scale;
    const sy = y / scale;
    const sw = w / scale;
    const sh = h / scale;

    const out = document.createElement('canvas');
    out.width = sw;
    out.height = sh;
    const ctx = out.getContext('2d');
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);

    out.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `crop-${Date.now()}.png`, { type: 'image/png' });
      const dataUrl = out.toDataURL('image/png');
      onCrop({ dataUrl, file });
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex flex-col items-center justify-center cursor-crosshair"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      tabIndex={0}
      autoFocus
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-full z-10 pointer-events-none">
        ลากเลือกบริเวณที่ต้องการ · กด Esc เพื่อยกเลิก
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className="max-w-full max-h-full"
      />
    </div>
  );
}