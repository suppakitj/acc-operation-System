import React, { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'team_analytics_chart_heights';

function getSavedHeights() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveHeights(heights) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(heights));
}

export default function ResizableChartWrapper({ chartId, children, minHeight = 200 }) {
  const [heights] = useState(getSavedHeights);
  const [height, setHeight] = useState(heights[chartId] || null);
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = containerRef.current?.offsetHeight || 300;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleTouchStart = useCallback((e) => {
    dragging.current = true;
    startY.current = e.touches[0].clientY;
    startH.current = containerRef.current?.offsetHeight || 300;
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragging.current) return;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      const delta = clientY - startY.current;
      const newH = Math.max(minHeight, startH.current + delta);
      setHeight(newH);
    };

    const handleUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // persist
      const all = getSavedHeights();
      all[chartId] = containerRef.current?.offsetHeight || height;
      saveHeights(all);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [chartId, height, minHeight]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={height ? { height: `${height}px` } : undefined}
    >
      <div className="h-full overflow-auto">{children}</div>
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize group flex items-center justify-center hover:bg-primary/5 transition-colors"
      >
        <div className="w-10 h-1 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
      </div>
    </div>
  );
}