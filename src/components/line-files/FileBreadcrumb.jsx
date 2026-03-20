import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FileBreadcrumb({ path, onNavigate }) {
  return (
    <nav className="flex items-center gap-0.5 text-sm flex-wrap min-w-0">
      {path.map((item, i) => {
        const isLast = i === path.length - 1;
        return (
          <React.Fragment key={item.id || 'root'}>
            {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mx-0.5" />}
            <button
              onClick={() => onNavigate(item.id)}
              disabled={isLast}
              className={cn(
                "px-2.5 py-1 rounded-md text-sm transition-colors truncate max-w-[200px]",
                isLast
                  ? "font-semibold text-foreground cursor-default"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              )}
              title={item.name}
            >
              {i === 0 && !item.id ? (
                <span className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </span>
              ) : (
                item.name
              )}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}