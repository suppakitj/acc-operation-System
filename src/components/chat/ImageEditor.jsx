import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Square, Circle, Type, ArrowUpRight, Undo2, Check } from 'lucide-react';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#ffffff', '#000000'];
const TOOLS = [
  { id: 'pen', icon: Pencil, label: 'วาด' },
  { id: 'rect', icon: Square, label: 'สี่เหลี่ยม' },
  { id: 'circle', icon: Circle, label: 'วงกลม' },
  { id: 'arrow', icon: ArrowUpRight, label: 'ลูกศร' },
  { id: 'text', icon: Type, label: 'ข้อความ' },
];

export default function ImageEditor({ src, onDone }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const imgRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [history, setHistory] = useState([]);
  const [textInput, setTextInput] = useState(null); // { x, y }
  const [textValue, setTextValue] = useState('');
  const [canvasReady, setCanvasReady] = useState(false);

  // Load image into canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      // Limit display size
      const maxW = 600;
      const scale = Math.min(maxW / img.width, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      canvas.width = w;
      canvas.height = h;
      overlay.width = w;
      overlay.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      setHistory([ctx.getImageData(0, 0, w, h)]);
      setCanvasReady(true);
    };
    img.src = src;
  }, [src]);

  const getPos = (e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Pen drawing - draw on main canvas directly
  const penDown = (pos) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const penMove = (pos) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  // Shape preview on overlay
  const drawShapePreview = (start, end) => {
    const ctx = overlayRef.current.getContext('2d');
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    if (tool === 'rect') {
      ctx.strokeRect(
        Math.min(start.x, end.x), Math.min(start.y, end.y),
        Math.abs(end.x - start.x), Math.abs(end.y - start.y)
      );
    } else if (tool === 'circle') {
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = Math.min(start.x, end.x) + rx;
      const cy = Math.min(start.y, end.y) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'arrow') {
      drawArrow(ctx, start.x, start.y, end.x, end.y);
    }
  };

  const drawArrow = (ctx, x1, y1, x2, y2) => {
    const headLen = 14;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  // Commit overlay shape to main canvas
  const commitShape = (start, end) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    if (tool === 'rect') {
      ctx.strokeRect(
        Math.min(start.x, end.x), Math.min(start.y, end.y),
        Math.abs(end.x - start.x), Math.abs(end.y - start.y)
      );
    } else if (tool === 'circle') {
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = Math.min(start.x, end.x) + rx;
      const cy = Math.min(start.y, end.y) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'arrow') {
      drawArrow(ctx, start.x, start.y, end.x, end.y);
    }

    // Clear overlay
    overlayRef.current.getContext('2d').clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    saveHistory();
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, data]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHist = history.slice(0, -1);
    setHistory(newHist);
    const ctx = canvasRef.current.getContext('2d');
    ctx.putImageData(newHist[newHist.length - 1], 0, 0);
  };

  // Event handlers
  const handleDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);

    if (tool === 'text') {
      setTextInput(pos);
      setTextValue('');
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);

    if (tool === 'pen') {
      penDown(pos);
    }
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);

    if (tool === 'pen') {
      penMove(pos);
    } else {
      drawShapePreview(startPos, pos);
    }
  };

  const handleUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getPos(e);

    if (tool === 'pen') {
      saveHistory();
    } else if (startPos) {
      commitShape(startPos, pos);
    }
    setStartPos(null);
  };

  const handleTextConfirm = () => {
    if (!textValue.trim() || !textInput) return;
    const ctx = canvasRef.current.getContext('2d');
    const fontSize = Math.max(16, lineWidth * 6);
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    // Draw text with outline for visibility
    ctx.strokeStyle = color === '#ffffff' ? '#000000' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText(textValue, textInput.x, textInput.y);
    ctx.fillText(textValue, textInput.x, textInput.y);
    saveHistory();
    setTextInput(null);
    setTextValue('');
  };

  const handleFinish = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `edited-${Date.now()}.png`, { type: 'image/png' });
      onDone({ dataUrl, file });
    }, 'image/png');
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap bg-muted/50 rounded-lg p-1.5">
        {TOOLS.map(t => (
          <Button
            key={t.id}
            variant={tool === t.id ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => { setTool(t.id); setTextInput(null); }}
            title={t.label}
          >
            <t.icon className="w-4 h-4" />
          </Button>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        {COLORS.map(c => (
          <button
            key={c}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
          />
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <select
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          className="h-7 text-xs border rounded px-1 bg-background"
        >
          <option value={2}>เส้นบาง</option>
          <option value={3}>ปกติ</option>
          <option value={5}>หนา</option>
          <option value={8}>หนามาก</option>
        </select>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleUndo} disabled={history.length <= 1} title="Undo">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" className="h-8 gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleFinish}>
          <Check className="w-4 h-4" /> เสร็จ
        </Button>
      </div>

      {/* Canvas area */}
      <div className="relative rounded-lg overflow-hidden bg-muted/30 flex justify-center">
        <div className="relative inline-block">
          <canvas ref={canvasRef} className="block max-w-full" />
          <canvas
            ref={overlayRef}
            className="absolute inset-0"
            style={{ cursor: tool === 'text' ? 'text' : 'crosshair' }}
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={handleUp}
            onMouseLeave={() => { if (isDrawing && tool === 'pen') { setIsDrawing(false); saveHistory(); } }}
            onTouchStart={handleDown}
            onTouchMove={handleMove}
            onTouchEnd={handleUp}
          />
          {/* Text input overlay */}
          {textInput && (
            <div
              className="absolute flex items-center gap-1"
              style={{ left: textInput.x, top: textInput.y, transform: 'translateY(-4px)' }}
            >
              <Input
                autoFocus
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTextConfirm(); if (e.key === 'Escape') setTextInput(null); }}
                className="h-7 text-sm w-40 border-2"
                style={{ borderColor: color, color }}
                placeholder="พิมพ์ข้อความ..."
              />
              <Button size="sm" className="h-7 w-7 p-0" onClick={handleTextConfirm}>
                <Check className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}