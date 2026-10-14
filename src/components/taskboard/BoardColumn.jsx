import React from 'react';

export default function BoardColumn({ title, count, children, empty }) {
  return (
    <div className="flex flex-col bg-muted/40 rounded-xl border min-w-[85vw] sm:min-w-[300px] md:min-w-0 snap-start">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <h2 className="font-semibold text-sm">{title}</h2>
        <span className="text-xs bg-background border rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="p-2 space-y-2 overflow-y-auto max-h-[70vh]">
        {count === 0 ? <p className="text-xs text-muted-foreground text-center py-6">{empty}</p> : children}
      </div>
    </div>
  );
}